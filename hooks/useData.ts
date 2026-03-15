import { useState, useEffect, useCallback } from 'react';
import { 
  Class, 
  Registration, 
  Venue, 
  Template, 
  AppSettings, 
  Disclaimer, 
  User, 
  Teacher, 
  AdminRole,
  WaiverData,
  InjuryRecord,
  GoogleCalendarTokens
} from '../types';
import { db } from '../services/db-supabase';

/**
 * Default app settings
 */
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

/**
 * Interface for all data state
 */
export interface UseDataState {
  classes: Class[];
  registrations: Registration[];
  venues: Venue[];
  templates: Template[];
  disclaimers: Disclaimer[];
  settings: AppSettings;
  users: User[];
  teachers: Teacher[];
  loading: boolean;
}

/**
 * Interface for registration handlers
 */
export interface UseDataRegistrationHandlers {
  handleRegister: (cls: Class, paymentProof?: string, notes?: string, injuries?: InjuryRecord[]) => Promise<void>;
  handleCancelRegistration: (regId: string) => Promise<void>;
  handleVerifyPayment: (regId: string, verified: boolean) => Promise<void>;
}

/**
 * Interface for class handlers
 */
export interface UseDataClassHandlers {
  handleAddClass: (newClass: Class) => Promise<void>;
  handleEditClass: (updatedClass: Class) => Promise<void>;
  handleDeleteClass: (classId: string) => Promise<void>;
}

/**
 * Interface for venue handlers
 */
export interface UseDataVenueHandlers {
  handleAddVenue: (newVenue: Venue) => Promise<void>;
  handleEditVenue: (updatedVenue: Venue) => Promise<void>;
  handleDeleteVenue: (venueId: string) => Promise<void>;
}

/**
 * Interface for template handlers
 */
export interface UseDataTemplateHandlers {
  handleAddTemplate: (newTemplate: Template) => Promise<void>;
  handleUpdateTemplate: (updatedTemplate: Template) => Promise<void>;
}

/**
 * Interface for disclaimer handlers
 */
export interface UseDataDisclaimerHandlers {
  handleAddDisclaimer: (newDisclaimer: Disclaimer) => Promise<void>;
  handleUpdateDisclaimer: (updatedDisclaimer: Disclaimer) => Promise<void>;
  handleDeleteDisclaimer: (disclaimerId: string) => Promise<void>;
}

/**
 * Interface for settings handlers
 */
export interface UseDataSettingsHandlers {
  handleUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  handleSaveCalendarTokens: (tokens: GoogleCalendarTokens) => Promise<void>;
}

/**
 * Interface for user handlers
 */
export interface UseDataUserHandlers {
  handleUpdateUser: (updates: Partial<User>) => Promise<void>;
  handleAddAdmin: (email: string, name: string, role: AdminRole) => Promise<any>;
  handleRemoveAdmin: (userId: string) => Promise<void>;
}

/**
 * Interface for teacher handlers
 */
export interface UseDataTeacherHandlers {
  handleAddTeacher: (teacher: Teacher) => Promise<Teacher[]>;
  handleEditTeacher: (teacher: Teacher) => Promise<Teacher[]>;
  handleDeleteTeacher: (teacherId: string) => Promise<void>;
}

/**
 * Combined interface for all useData return values
 */
export interface UseDataReturn extends 
  UseDataState,
  UseDataRegistrationHandlers,
  UseDataClassHandlers,
  UseDataVenueHandlers,
  UseDataTemplateHandlers,
  UseDataDisclaimerHandlers,
  UseDataSettingsHandlers,
  UseDataUserHandlers,
  UseDataTeacherHandlers {}

/**
 * Custom hook for data management and CRUD operations
 * 
 * Manages:
 * - Classes, registrations, venues, templates, disclaimers, settings, users, teachers state
 * - Data loading from Supabase
 * - All CRUD handlers for each entity type
 * 
 * @returns Object containing data state and handler functions
 */
export function useData(): UseDataReturn {
  // --- Data State ---
  const [classes, setClasses] = useState<Class[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load all data from Supabase on mount
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          classesResult,
          registrationsData,
          venuesData,
          templatesData,
          disclaimersData,
          usersResult,
          teachersData,
          settingsData
        ] = await Promise.all([
          db.getClassesPaginated(1, 100),
          db.getRegistrations(),
          db.getVenues(),
          db.getTemplates(),
          db.getDisclaimers(),
          db.getUsersPaginated(1, 200),
          db.getTeachers(),
          db.getSettings()
        ]);
        
        setClasses(classesResult.classes);
        setRegistrations(registrationsData);
        setVenues(venuesData);
        setTemplates(templatesData);
        setDisclaimers(disclaimersData);
        setUsers(usersResult.users);
        setTeachers(teachersData);
        if (settingsData) setSettings(settingsData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // --- Registration Handlers ---

  /**
   * Handle user registration for a class
   */
  const handleRegister = useCallback(async (
    cls: Class, 
    paymentProof?: string, 
    notes?: string, 
    injuries?: InjuryRecord[]
  ) => {
    // This would need user from context - placeholder for typing
    const userId = ''; 
    const userName = '';
    const userEmail = '';
    const userSport = 'General';
    
    try {
      const isFree = cls.price === 0;
      
      const newReg: Registration = {
        id: `r${Date.now()}`,
        classId: cls.id,
        userId,
        userName,
        userEmail,
        userSport,
        bodyAreas: [],
        referredBy: null,
        status: isFree ? 'confirmed' : 'payment_review',
        paymentStatus: isFree ? 'paid' : 'pending',
        paymentMethod: isFree ? 'free' : 'zapper',
        paymentProof: paymentProof,
        registeredAt: new Date().toISOString(),
        notes: notes,
        injuries: injuries
      };
      
      await db.addRegistration(newReg);
      
      const [updatedRegistrations, updatedClasses] = await Promise.all([
        db.getRegistrations(),
        db.getClasses()
      ]);
      setRegistrations(updatedRegistrations);
      setClasses(updatedClasses);
    } catch (err) {
      console.error('Failed to register:', err);
    }
  }, []);

  /**
   * Handle cancellation of a class registration
   */
  const handleCancelRegistration = useCallback(async (regId: string) => {
    try {
      const reg = registrations.find(r => r.id === regId);
      if (reg) {
        const cls = classes.find(c => c.id === reg.classId);
        if (cls) {
          const classDate = new Date(cls.dateTime);
          const now = new Date();
          const hoursDiff = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            const confirmCancel = window.confirm(
              "Cancellation Policy Warning:\n\nYou are cancelling within 24 hours of the class. " +
              "This falls within our cancellation window and may not be eligible for a refund.\n\n" +
              "Do you still want to proceed?"
            );
            if (!confirmCancel) return;
          }
        }
      }

      await db.cancelRegistration(regId);
      
      const [updatedRegistrations, updatedClasses] = await Promise.all([
        db.getRegistrations(),
        db.getClasses()
      ]);
      setRegistrations(updatedRegistrations);
      setClasses(updatedClasses);
    } catch (err) {
      console.error('Failed to cancel registration:', err);
    }
  }, [registrations, classes]);

  /**
   * Handle payment verification by admin
   */
  const handleVerifyPayment = useCallback(async (regId: string, verified: boolean) => {
    try {
      const regs = await db.getRegistrations();
      const reg = regs.find(r => r.id === regId);
      if (reg) {
        const updatedReg: Registration = {
          ...reg,
          status: verified ? 'confirmed' : 'cancelled',
          paymentStatus: verified ? 'verified' : 'unpaid'
        };
        await db.updateRegistration(updatedReg);
        const updated = await db.getRegistrations();
        setRegistrations(updated);
      }
    } catch (err) {
      console.error('Failed to verify payment:', err);
    }
  }, []);

  // --- Class Handlers ---

  /**
   * Add a new class
   */
  const handleAddClass = useCallback(async (newClass: Class) => {
    try {
      await db.addClass(newClass);
      const updated = await db.getClasses();
      setClasses(updated);
    } catch (err) {
      console.error('Failed to add class:', err);
    }
  }, []);

  /**
   * Update an existing class
   */
  const handleEditClass = useCallback(async (updatedClass: Class) => {
    try {
      await db.updateClass(updatedClass);
      const updated = await db.getClasses();
      setClasses(updated);
    } catch (err) {
      console.error('Failed to edit class:', err);
    }
  }, []);

  /**
   * Delete a class
   */
  const handleDeleteClass = useCallback(async (classId: string) => {
    try {
      await db.deleteClass(classId);
      setClasses(prev => prev.filter(c => c.id !== classId));
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  }, []);

  // --- Venue Handlers ---

  /**
   * Add a new venue
   */
  const handleAddVenue = useCallback(async (newVenue: Venue) => {
    try {
      await db.addVenue(newVenue);
      const updated = await db.getVenues();
      setVenues(updated);
    } catch (err) {
      console.error('Failed to add venue:', err);
    }
  }, []);

  /**
   * Update an existing venue
   */
  const handleEditVenue = useCallback(async (updatedVenue: Venue) => {
    try {
      await db.updateVenue(updatedVenue);
      const updated = await db.getVenues();
      setVenues(updated);
    } catch (err) {
      console.error('Failed to edit venue:', err);
    }
  }, []);

  /**
   * Delete a venue
   */
  const handleDeleteVenue = useCallback(async (venueId: string) => {
    try {
      await db.deleteVenue(venueId);
      setVenues(prev => prev.filter(v => v.id !== venueId));
    } catch (err) {
      console.error('Failed to delete venue:', err);
    }
  }, []);

  // --- Template Handlers ---

  /**
   * Add a new template
   */
  const handleAddTemplate = useCallback(async (newTemplate: Template) => {
    try {
      await db.addTemplate(newTemplate);
      const updated = await db.getTemplates();
      setTemplates(updated);
    } catch (err) {
      console.error('Failed to add template:', err);
    }
  }, []);

  /**
   * Update an existing template
   */
  const handleUpdateTemplate = useCallback(async (updatedTemplate: Template) => {
    try {
      await db.updateTemplate(updatedTemplate);
      const updated = await db.getTemplates();
      setTemplates(updated);
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  }, []);

  // --- Disclaimer Handlers ---

  /**
   * Add a new disclaimer
   */
  const handleAddDisclaimer = useCallback(async (newDisclaimer: Disclaimer) => {
    try {
      await db.addDisclaimer(newDisclaimer);
      const updated = await db.getDisclaimers();
      setDisclaimers(updated);
    } catch (err) {
      console.error('Failed to add disclaimer:', err);
    }
  }, []);

  /**
   * Update an existing disclaimer
   */
  const handleUpdateDisclaimer = useCallback(async (updatedDisclaimer: Disclaimer) => {
    try {
      await db.updateDisclaimer(updatedDisclaimer);
      const updated = await db.getDisclaimers();
      setDisclaimers(updated);
    } catch (err) {
      console.error('Failed to update disclaimer:', err);
    }
  }, []);

  /**
   * Delete a disclaimer
   */
  const handleDeleteDisclaimer = useCallback(async (disclaimerId: string) => {
    try {
      await db.deleteDisclaimer(disclaimerId);
      setDisclaimers(prev => prev.filter(d => d.id !== disclaimerId));
    } catch (err) {
      console.error('Failed to delete disclaimer:', err);
    }
  }, []);

  // --- Settings Handlers ---

  /**
   * Update app settings
   */
  const handleUpdateSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      await db.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  }, []);

  /**
   * Save Google Calendar tokens
   */
  const handleSaveCalendarTokens = useCallback(async (tokens: GoogleCalendarTokens) => {
    try {
      const currentSettings = await db.getSettings();
      const updatedSettings = { ...currentSettings, googleCalendarTokens: tokens };
      await db.updateSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (err) {
      console.error('Failed to save calendar tokens:', err);
    }
  }, []);

  // --- User Handlers ---

  /**
   * Update user profile
   */
  const handleUpdateUser = useCallback(async (updates: Partial<User>) => {
    // This would need user from context
    const currentUser = null;
    if (!currentUser) return;
    
    try {
      const updatedUser: User = {
        ...currentUser,
        ...updates
      };
      
      // Import syncUserToServer from useAuth
      const response = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updatedUser })
      });
      
      if (response.ok) {
        const updatedUsers = await db.getUsers();
        setUsers(updatedUsers);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }, []);

  /**
   * Add a new admin user
   */
  const handleAddAdmin = useCallback(async (email: string, name: string, role: AdminRole) => {
    // This would need current user from context
    const inviterId = '';
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role, inviterId })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite admin');
      }
      
      const updated = await db.getUsers();
      setUsers(updated);
      
      return result;
    } catch (err) {
      console.error('Failed to add admin:', err);
      throw err;
    }
  }, []);

  /**
   * Remove admin privileges from a user
   */
  const handleRemoveAdmin = useCallback(async (userId: string) => {
    try {
      const existingUsers = await db.getUsers();
      const adminUser = existingUsers.find(u => u.id === userId);
      
      if (adminUser) {
        adminUser.isAdmin = false;
        adminUser.adminRole = undefined;
        
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: adminUser })
        });
        
        const updated = await db.getUsers();
        setUsers(updated);
      }
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  }, []);

  // --- Teacher Handlers ---

  /**
   * Add a new teacher
   */
  const handleAddTeacher = useCallback(async (teacher: Teacher): Promise<Teacher[]> => {
    try {
      const result = await db.addTeacher(teacher);
      if (result && result.length > 0) {
        const updated = await db.getTeachers();
        setTeachers(updated);
        return result;
      }
      throw new Error('Failed to add teacher');
    } catch (err) {
      console.error('Failed to add teacher:', err);
      return [];
    }
  }, []);

  /**
   * Update an existing teacher
   */
  const handleEditTeacher = useCallback(async (teacher: Teacher): Promise<Teacher[]> => {
    try {
      const result = await db.updateTeacher(teacher);
      if (result && result.length > 0) {
        const updated = await db.getTeachers();
        setTeachers(updated);
        return result;
      }
      throw new Error('Failed to update teacher');
    } catch (err) {
      console.error('Failed to edit teacher:', err);
      return [];
    }
  }, []);

  /**
   * Delete a teacher
   */
  const handleDeleteTeacher = useCallback(async (teacherId: string) => {
    try {
      await db.deleteTeacher(teacherId);
      setTeachers(prev => prev.filter(i => i.id !== teacherId));
    } catch (err) {
      console.error('Failed to delete teacher:', err);
    }
  }, []);

  return {
    // State
    classes,
    registrations,
    venues,
    templates,
    disclaimers,
    settings,
    users,
    teachers,
    loading,
    // Registration handlers
    handleRegister,
    handleCancelRegistration,
    handleVerifyPayment,
    // Class handlers
    handleAddClass,
    handleEditClass,
    handleDeleteClass,
    // Venue handlers
    handleAddVenue,
    handleEditVenue,
    handleDeleteVenue,
    // Template handlers
    handleAddTemplate,
    handleUpdateTemplate,
    // Disclaimer handlers
    handleAddDisclaimer,
    handleUpdateDisclaimer,
    handleDeleteDisclaimer,
    // Settings handlers
    handleUpdateSettings,
    handleSaveCalendarTokens,
    // User handlers
    handleUpdateUser,
    handleAddAdmin,
    handleRemoveAdmin,
    // Teacher handlers
    handleAddTeacher,
    handleEditTeacher,
    handleDeleteTeacher
  };
}

export { DEFAULT_SETTINGS };
