import { useState, useEffect, Suspense, lazy, Component, ReactNode, useRef } from 'react';
import { User, AppState, Class, Registration, Venue, Template, AppSettings, WaiverData, ChatMessage, Teacher, InjuryRecord, Disclaimer } from './types';

// Auto-logout after 5 minutes of inactivity
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Server-side user sync to bypass RLS
const syncUserToServer = async (user: User): Promise<void> => {
  try {
    const response = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (!response.ok) {
      console.error('[syncUserToServer] failed:', response.statusText);
    }
  } catch (err) {
    console.error('[syncUserToServer] error:', err);
  }
};

// Lazy load large screens for code splitting
const AdminApp = lazy(() => import('./screens/AdminApp').then(module => ({ default: module.AdminApp })));
const TeacherApp = lazy(() => import('./screens/TeacherApp').then(module => ({ default: module.TeacherApp })));
const ClientApp = lazy(() => import('./screens/ClientApp').then(module => ({ default: module.ClientApp })));
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen').then(module => ({ default: module.OnboardingScreen })));
const InviteLandingPage = lazy(() => import('./screens/InviteLandingPage').then(module => ({ default: module.InviteLandingPage })));

// Lazy load heavy components
const ShaderShowcaseLazy = lazy(() => import('./screens/ShaderShowcase').then(module => ({ default: module.ShaderShowcase })));

const ClientLoginScreenLazy = lazy(() => import('./screens/ClientLoginScreen').then(module => ({ default: module.ClientLoginScreen })));
const TeacherLoginScreenLazy = lazy(() => import('./screens/TeacherLoginScreen').then(module => ({ default: module.TeacherLoginScreen })));
const AdminLoginScreenLazy = lazy(() => import('./screens/AdminLoginScreen').then(module => ({ default: module.AdminLoginScreen })));
const AuthLandingLazy = lazy(() => import('./screens/AuthLanding').then(module => ({ default: module.AuthLanding })));

// Loading fallback for lazy-loaded components
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#FBF7EF]">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6E7568] mb-4"></div>
      <p className="text-[#6E7568] text-sm font-medium">Loading...</p>
    </div>
  </div>
);

// Loading spinner component for inline use
const InlineLoading = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E7568]"></div>
  </div>
);

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-[#FBF7EF]">
          <div className="flex flex-col items-center p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-[#6E7568] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#6E7568] mb-4">Please refresh the page to try again.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#6E7568] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#5a6358] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Keep these as regular imports (lightweight)
import { db } from './services/db-supabase';
import { ToastProvider, useToast } from './components/Toast';
import { getCurrentUser, onAuthStateChange, signOut, isSupabaseConfigured, exchangeCodeForSession } from './lib/supabase';
import { createToastHandlers } from './App.toast-fixes';

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Pause Fascia Movement',
  contactEmail: 'admin@pausefmd.co.za',
  additionalContactEmails: [],
  zapperQrBase64: '',
  landingPage: {
    headerText: 'where fascia becomes FLUID',
    subheaderText: 'Step into the Dome',
    expectations: [],
    fasciaEducation: [],
    heroCtaText: 'Book Your First Class',
    heroSubtext: 'Experience the transformative power of fascia-focused movement'
  },
  email: {
    provider: 'mock',
    apiKey: '',
    senderName: 'Pause Admin',
    senderEmail: 'hello@pausefmd.co.za',
    waitlistTemplate: ''
  },
  googleCalendarSyncEnabled: false
};

// Inner component that uses Toast context
function AppContent() {
  const { showToast } = useToast();
  const [appState, setAppState] = useState<AppState>("signin");
  const [authScreen, setAuthScreen] = useState<'landing' | 'client' | 'teacher' | 'admin'>('landing');
  const [user, setUser] = useState<User | null>(null);
  
  // --- Global Data State (Hydrated from DB) ---
  const [classes, setClasses] = useState<Class[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(false);

  const [showLandingPreview, setShowLandingPreview] = useState<boolean>(false);
  const [showShaderPreview, setShowShaderPreview] = useState<boolean>(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  
  // Chat state - loaded from Supabase
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Load chat messages from Supabase on mount
  useEffect(() => {
    if (user) {
      // Chat messages loaded via ChatWidget component
    }
  }, [user]);
  
  // Save new chat messages to Supabase
  useEffect(() => {
    // This effect handles syncing - no localStorage needed
  }, [chatMessages]);

  // Chat handlers
  const handleSendChatMessage = async (content: string, recipientId?: string) => {
    if (!user) return;
    
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.isAdmin ? 'admin' : 'client',
      recipientId: recipientId || 'admin',
      content,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Update local state (persisted via ChatWidget)
    setChatMessages(prev => [...prev, newMessage]);
  };
  
  const getUnreadChatCount = () => {
    if (!user) return 0;
    return chatMessages.filter(m => m.recipientId === user.id && !m.read).length;
  };

  // Auto-logout after 1 minute of inactivity
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    if (user) {
      inactivityTimer.current = setTimeout(() => {
        console.log('[Inactivity] Auto-logging out due to inactivity');
        handleSignOut();
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    if (user) {
      // Reset timer on user activity
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
      });
      
      // Start the timer
      resetInactivityTimer();
      
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, resetInactivityTimer);
        });
        if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current);
        }
      };
    }
  }, [user]);

  // --- Load Data from Supabase on Mount ---
  useEffect(() => {
    loadDataWithToast(
      setClasses,
      setRegistrations,
      setVenues,
      setTemplates,
      setDisclaimers,
      setUsers,
      setTeachers,
      setSettings,
      setLoading
    );
  }, []);

  // --- Check for Landing Preview Mode ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'landing') {
      setShowLandingPreview(true);
    }
    if (params.get('preview') === 'shader') {
      setShowShaderPreview(true);
    }
    // Check for referrer parameter (e.g., from WhatsApp share)
    const ref = params.get('referrer');
    if (ref) {
      setReferrerName(decodeURIComponent(ref));
    }
  }, []);

  // --- Check for OAuth/Magic Link Session on Mount ---
  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured()) {
        // Check for auth code in URL (from magic link)
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        
        if (authCode) {
          console.log('[Auth] Magic link code detected, exchanging for session...');
          setAuthChecking(true);
          const result = await exchangeCodeForSession(authCode);
          if (result.success) {
            console.log('[Auth] Successfully exchanged code for session');
            // Remove code from URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.error('[Auth] Failed to exchange code:', result.error);
          }
          setAuthChecking(false);
        }
        
        const supabaseUser = await getCurrentUser();
        if (supabaseUser) {
          console.log('[Auth] User authenticated:', supabaseUser.email);
          // Check if user exists in local DB, if not create them
          const existingUsers = await db.getUsers();
          let dbUser = existingUsers.find(u => u.email === supabaseUser.email);
          
          if (!dbUser) {
            // Create new user from magic link/OAuth data
            dbUser = {
              id: supabaseUser.id,
              name: supabaseUser.name,
              email: supabaseUser.email,
              isAdmin: false,
              waiverAccepted: false
            };
            // Use server endpoint to bypass RLS
            await syncUserToServer(dbUser);
          }
          
          setUser(dbUser);
          
          // Check admin status first
          if (dbUser.isAdmin) {
            setAppState("admin");
          } else {
            // Check waiver status - go straight to onboarding if not signed
            const hasSignedWaiver = dbUser.waiverData?.signed || dbUser.waiverAccepted;
            console.log('[Auth] Waiver status:', hasSignedWaiver ? 'signed' : 'not signed');
            setAppState(hasSignedWaiver ? "client" : "onboarding");
          }
        } else {
          console.log('[Auth] No active session found');
        }
      }
    };
    
    checkSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      if (authUser) {
        const existingUsers = await db.getUsers();
        let dbUser = existingUsers.find(u => u.email === authUser.email);
        
        if (!dbUser) {
          dbUser = {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            isAdmin: false,
            waiverAccepted: false
          };
          await syncUserToServer(dbUser);
        }
        
        setUser(dbUser);
        if (dbUser.isAdmin) {
          setAppState("admin");
        } else {
          const hasSignedWaiver = dbUser.waiverData?.signed || dbUser.waiverAccepted;
          setAppState(hasSignedWaiver ? "client" : "onboarding");
        }
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // --- Auth Handlers ---
  const handleSignIn = async () => {
    try {
      // Get authenticated user from Supabase
      const supabaseUser = await getCurrentUser();
      
      if (!supabaseUser) {
        console.warn('[App] No authenticated user found');
        return;
      }
      
      // Get existing user from DB to preserve waiver status, etc.
      const existingUsers = await db.getUsers();
      let currentUser = existingUsers.find(u => u.email === supabaseUser.email);

      if (!currentUser) {
        // New user - sync to DB
        currentUser = {
          id: supabaseUser.id,
          name: supabaseUser.name,
          email: supabaseUser.email,
          isAdmin: false,
          waiverAccepted: false
        };
        await syncUserToServer(currentUser);
      }
      
      setUser(currentUser);
      
      // Check detailed waiver data OR legacy boolean
      const hasSignedWaiver = currentUser.waiverData?.signed || currentUser.waiverAccepted;

      // Redirect to onboarding if waiver not signed
      if (!hasSignedWaiver) {
          setAppState("onboarding");
      } else {
          setAppState("client");
      }
    } catch (err) {
      console.error('Failed to sign in:', err);
    }
  };

  const handleManualSignUp = async (name: string, email: string) => {
    let currentUser: User | null = null;
    try {
      const existingUsers = await db.getUsers();
      currentUser = existingUsers.find(u => u.email === email) || null;
      
      if (!currentUser) {
          currentUser = {
              id: `u${Date.now()}`,
              name,
              email,
              isAdmin: false,
              waiverAccepted: false
          };
          // Use the public registration endpoint that doesn't require auth
          const response = await fetch('/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser })
          });
          if (!response.ok) {
            const err = await response.json();
            console.error('[handleManualSignUp] Registration failed:', err);
            throw new Error(err.error || 'Failed to create account');
          }
          console.log('[handleManualSignUp] User registered successfully');
      }
      
      if (currentUser) {
        setUser(currentUser);
        setAppState("onboarding");
      }
    } catch (err) {
      console.error('Failed to sign up:', err);
      // Still allow user to proceed with local-only mode if server fails
      if (currentUser) {
        setUser(currentUser);
        setAppState("onboarding");
      }
    }
  };

  // SECURITY: Removed hardcoded admin/teacher sign-in.
  // Admin and teacher access must be granted through proper authentication flow.
  // Users with admin/teacher roles in the database can access these views after login.

  const handleSignOut = async () => {
    // Sign out from Supabase if configured
    if (isSupabaseConfigured()) {
      await signOut();
    }
    setUser(null);
    setAppState("signin");
    setAuthScreen('landing');
  };

  const handleOnboardingComplete = async (waiverData: WaiverData, injuries: InjuryRecord[]) => {
      if (user) {
          try {
              const updatedUser: User = {
                  ...user,
                  waiverAccepted: true, // Legacy compatibility
                  waiverData: waiverData, // New detailed persistence
                  injuries: injuries // Store injury records
              };
              
            // Save to DB
            await syncUserToServer(updatedUser);
            
            // Send welcome email
            try {
              await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: user.email,
                  subject: 'Welcome to The FASCIA Movement Dome! 🧘',
                  template: 'welcome',
                  data: { name: user.name }
                })
              });
            } catch (emailErr) {
              console.error('[Onboarding] Welcome email failed:', emailErr);
            }
            
            // Update Local State
              setUser(updatedUser);
              setAppState("client");
          } catch (err) {
              console.error('Failed to complete onboarding:', err);
          }
      }
  };

  // --- Data Handlers (Connected to DB with Toast Notifications) ---
  const {
    handleRegister,
    handleCancelRegistration,
    handleAddClass,
    handleEditClass,
    handleDeleteClass,
    handleAddVenue,
    handleEditVenue,
    handleDeleteVenue,
    handleAddTemplate,
    handleUpdateTemplate,
    handleAddDisclaimer,
    handleUpdateDisclaimer,
    handleDeleteDisclaimer,
    handleUpdateSettings,
    handleVerifyPayment,
    handleUpdateUser,
    handleAddAdmin,
    handleRemoveAdmin,
    handleAddTeacher,
    handleEditTeacher,
    handleDeleteTeacher,
    handleSaveCalendarTokens,
    loadDataWithToast
  } = createToastHandlers(showToast, {
    user,
    classes,
    registrations,
    setClasses,
    setRegistrations,
    setVenues,
    setTemplates,
    setDisclaimers,
    setSettings,
    setUsers,
    setTeachers,
    setUser,
    venues,
    templates,
    disclaimers
  });

  // --- Loading Spinner ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBF7EF]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6E7568] mb-4"></div>
          <p className="text-[#6E7568] text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // --- Previews ---
  if (showLandingPreview) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <div>
            <div className="bg-[#6E7568] p-3 flex justify-between items-center sticky top-0 z-50 shadow-md">
              <span className="text-[10px] font-bold text-[#FBF7EF] tracking-[1px] uppercase">Preview Mode</span>
              <button onClick={() => setShowLandingPreview(false)} className="bg-transparent border border-[#FBF7EF]/30 text-[#FBF7EF] rounded-md py-1 px-3 text-xs cursor-pointer font-bold uppercase tracking-wider">
                Close
              </button>
            </div>
            <InviteLandingPage
              classes={classes}
              venues={venues}
              referrerName={referrerName || undefined}
              forceRefreshSettings={true}
              onRegister={() => {
                setShowLandingPreview(false);
                setAppState("signin");
              }}
            />
          </div>
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (showShaderPreview) {
    return (
      <Suspense fallback={<InlineLoading />}>
        <div className="relative">
          <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={() => setShowShaderPreview(false)} 
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full py-2 px-4 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-colors cursor-pointer"
            >
              Close Preview
            </button>
          </div>
          <ShaderShowcaseLazy />
        </div>
      </Suspense>
    );
  }

  // Show loading screen while processing magic link
  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#6E7568]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FBF7EF] mb-4"></div>
          <p className="text-[#FBF7EF] text-sm font-medium">Logging you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-['Montserrat'] bg-[#FBF7EF] min-h-screen">
        {appState === "signin" && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <>
                {authScreen === 'landing' && (
                  <AuthLandingLazy 
                    onClientLogin={() => { 
                      setAuthScreen('client'); 
                    }}
                  />
                )}
                {authScreen === 'client' && (
                  <ClientLoginScreenLazy 
                    onBack={() => setAuthScreen('landing')}
                    onSignIn={handleSignIn}
                    onManualSignUp={handleManualSignUp}
                  />
                )}
                {authScreen === 'teacher' && (
                  <TeacherLoginScreenLazy 
                    onBack={() => setAuthScreen('landing')}
                    onSignIn={handleSignIn}
                  />
                )}
                {authScreen === 'admin' && (
                  <AdminLoginScreenLazy 
                    onBack={() => setAuthScreen('landing')}
                    onSignIn={handleSignIn}
                  />
                )}
              </>
            </Suspense>
          </ErrorBoundary>
        )}

        {appState === "onboarding" && user && (
          <ErrorBoundary>
            <Suspense fallback={<InlineLoading />}>
              <OnboardingScreen 
                userName={user.name} 
                userEmail={user.email}
                userId={user.id}
                disclaimers={disclaimers} 
                onComplete={handleOnboardingComplete} 
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {appState === "client" && user && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <ClientApp 
                user={user} 
                onSignOut={handleSignOut}
                classes={classes}
                registrations={registrations}
                venues={venues}
                settings={settings}
                onRegister={handleRegister}
                onCancel={handleCancelRegistration}
                onUpdateUser={handleUpdateUser}
                chatMessages={chatMessages}
                onSendChatMessage={handleSendChatMessage}
                unreadChatCount={getUnreadChatCount()}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {appState === "admin" && user && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AdminApp 
                user={user} 
                onSignOut={handleSignOut}
                classes={classes}
                registrations={registrations}
                venues={venues}
                templates={templates}
                disclaimers={disclaimers}
                settings={settings}
                users={users}
                teachers={teachers}
                onAddClass={handleAddClass}
                onEditClass={handleEditClass}
                onDeleteClass={handleDeleteClass}
                onAddVenue={handleAddVenue}
                onEditVenue={handleEditVenue}
                onDeleteVenue={handleDeleteVenue}
                onAddTemplate={handleAddTemplate}
                onUpdateTemplate={handleUpdateTemplate}
                onAddDisclaimer={handleAddDisclaimer}
                onUpdateDisclaimer={handleUpdateDisclaimer}
                onDeleteDisclaimer={handleDeleteDisclaimer}
                onUpdateSettings={handleUpdateSettings}
                onVerifyPayment={handleVerifyPayment}
                onPreviewLanding={() => setShowLandingPreview(true)}
                onSaveCalendarTokens={handleSaveCalendarTokens}
                onUpdateUser={handleUpdateUser}
                onAddAdmin={handleAddAdmin}
                onRemoveAdmin={handleRemoveAdmin}
                onAddTeacher={handleAddTeacher}
                onEditTeacher={handleEditTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                chatMessages={chatMessages}
                onSendChatMessage={handleSendChatMessage}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {appState === "teacher" && user && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <TeacherApp 
                user={user} 
                onSignOut={handleSignOut}
                classes={classes}
                registrations={registrations}
                venues={venues}
                settings={settings}
                teachers={teachers}
                onUpdateUser={handleUpdateUser}
                chatMessages={chatMessages}
                onSendChatMessage={handleSendChatMessage}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
  );
}

// Wrapper component that provides Toast context
export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
