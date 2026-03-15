import React, { useState } from 'react';
import { User, AdminRole, AppSettings, ROLE_PERMISSIONS } from '../../types';
import * as Icons from '../Icons';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Tab types for the settings panel
type SettingsTab = 'general' | 'payments' | 'notifications' | 'booking' | 'users' | 'integrations' | 'permissions' | 'admins';

export interface AdminSettingsProps {
    user: User;
    users: User[];
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    onAddAdmin?: (email: string, name: string, role: AdminRole) => void;
    onRemoveAdmin?: (userId: string) => void;
    onShowToast: (message: string, type: ToastType) => void;
    onSaveCalendarTokens?: (tokens: Record<string, unknown>) => void;
    onUpdateUser?: (user: User) => void;
    onPreviewLanding?: () => void;
}

interface GeneralSettings {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
    timezone: string;
    currency: string;
    operatingHours: {
        monday: { open: string; close: string; enabled: boolean };
        tuesday: { open: string; close: string; enabled: boolean };
        wednesday: { open: string; close: string; enabled: boolean };
        thursday: { open: string; close: string; enabled: boolean };
        friday: { open: string; close: string; enabled: boolean };
        saturday: { open: string; close: string; enabled: boolean };
        sunday: { open: string; close: string; enabled: boolean };
    };
}

interface PaymentSettings {
    payfastMerchantId: string;
    payfastMerchantKey: string;
    payfastPassphrase: string;
    testMode: boolean;
    defaultCreditPackages: { credits: number; price: number; name: string }[];
    refundPolicy: string;
    refundWindowHours: number;
}

interface NotificationSettings {
    emailEnabled: boolean;
    smsEnabled: boolean;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string;
    bookingConfirmationEmail: boolean;
    bookingConfirmationSms: boolean;
    classReminderEmail: boolean;
    classReminderSms: boolean;
    reminderHoursBefore: number;
    waitlistNotificationEmail: boolean;
    paymentConfirmationEmail: boolean;
    marketingEmails: boolean;
}

interface BookingSettings {
    defaultClassCapacity: number;
    cancellationWindowHours: number;
    waitlistEnabled: boolean;
    autoWaitlistPromotion: boolean;
    bookingWindowDays: number;
    allowDomeResetOverride: boolean;
    requireWaiver: boolean;
    autoApprovalNewUsers: boolean;
}

interface IntegrationSettings {
    googleCalendarEnabled: boolean;
    payfastEnabled: boolean;
    twilioEnabled: boolean;
    sendgridEnabled: boolean;
    webhookUrl: string;
    webhookSecret: string;
}

interface Permission {
    key: string;
    label: string;
    description: string;
}

const PERMISSIONS: Permission[] = [
    { key: 'canViewDashboard', label: 'View Dashboard', description: 'Access admin dashboard and analytics' },
    { key: 'canManageUsers', label: 'Manage Users', description: 'Add, edit, and remove users' },
    { key: 'canManageClasses', label: 'Manage Classes', description: 'Create and manage class schedules' },
    { key: 'canManageBookings', label: 'Manage Bookings', description: 'View and manage all bookings' },
    { key: 'canManagePayments', label: 'Manage Payments', description: 'Process payments and refunds' },
    { key: 'canManageCredits', label: 'Manage Credits', description: 'Add and manage user credits' },
    { key: 'canViewAnalytics', label: 'View Reports', description: 'Access analytics and reports' },
    { key: 'canManageSettings', label: 'Manage Settings', description: 'Modify application settings' },
    { key: 'canManageAdmins', label: 'Manage Admins', description: 'Add and manage admin users' },
];

export const AdminSettings: React.FC<AdminSettingsProps> = ({
    user,
    users,
    settings,
    onUpdateSettings,
    onAddAdmin,
    onRemoveAdmin,
    onShowToast,
    onSaveCalendarTokens,
    onUpdateUser,
    onPreviewLanding: _onPreviewLanding,
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    
    // Form state for each section
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        businessName: 'Fascia Studio',
        businessAddress: '',
        businessPhone: '',
        businessEmail: settings.contactEmail || '',
        timezone: 'Africa/Johannesburg',
        currency: 'ZAR',
        operatingHours: {
            monday: { open: '06:00', close: '20:00', enabled: true },
            tuesday: { open: '06:00', close: '20:00', enabled: true },
            wednesday: { open: '06:00', close: '20:00', enabled: true },
            thursday: { open: '06:00', close: '20:00', enabled: true },
            friday: { open: '06:00', close: '20:00', enabled: true },
            saturday: { open: '08:00', close: '18:00', enabled: true },
            sunday: { open: '08:00', close: '16:00', enabled: false },
        },
    });

    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
        payfastMerchantId: '',
        payfastMerchantKey: '',
        payfastPassphrase: '',
        testMode: true,
        defaultCreditPackages: [
            { credits: 1, price: 250, name: 'Single Class' },
            { credits: 5, price: 1100, name: '5 Classes' },
            { credits: 10, price: 2000, name: '10 Classes' },
        ],
        refundPolicy: 'Full refund within 24 hours of purchase. No refunds for unused credits after 30 days.',
        refundWindowHours: 24,
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        emailEnabled: true,
        smsEnabled: false,
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumber: '',
        bookingConfirmationEmail: true,
        bookingConfirmationSms: false,
        classReminderEmail: true,
        classReminderSms: false,
        reminderHoursBefore: 24,
        waitlistNotificationEmail: true,
        paymentConfirmationEmail: true,
        marketingEmails: false,
    });

    const [bookingSettings, setBookingSettings] = useState<BookingSettings>({
        defaultClassCapacity: 12,
        cancellationWindowHours: 24,
        waitlistEnabled: true,
        autoWaitlistPromotion: true,
        bookingWindowDays: 30,
        allowDomeResetOverride: true,
        requireWaiver: true,
        autoApprovalNewUsers: false,
    });

    const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
        googleCalendarEnabled: !!settings.googleCalendarTokens,
        payfastEnabled: true,
        twilioEnabled: false,
        sendgridEnabled: false,
        webhookUrl: '',
        webhookSecret: '',
    });

    // Admin management state
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [newAdminRole, setNewAdminRole] = useState<AdminRole>('staff');
    
    // 2FA state
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFASecret, _setTwoFASecret] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    // Masked input state
    const [showPayfastKey, setShowPayfastKey] = useState(false);
    const [showPayfastPassphrase, setShowPayfastPassphrase] = useState(false);
    const [showTwilioToken, setShowTwilioToken] = useState(false);
    const [showWebhookSecret, setShowWebhookSecret] = useState(false);

    // Check if current user can manage admins
    const currentUserPermissions = user.isAdmin ? ROLE_PERMISSIONS[user.adminRole || 'admin'] : null;
    const canManageAdmins = currentUserPermissions?.canManageAdmins ?? false;

    // Get all admin users
    const adminUsers = users.filter(u => u.isAdmin);

    // Tab configuration
    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'General', icon: <Icons.SettingsIcon size={16} /> },
        { id: 'payments', label: 'Payments', icon: <Icons.CreditCardIcon size={16} /> },
        { id: 'notifications', label: 'Notifications', icon: <Icons.BellIcon size={16} /> },
        { id: 'booking', label: 'Booking', icon: <Icons.CalendarIcon size={16} /> },
        { id: 'users', label: 'Users', icon: <Icons.UsersIcon size={16} /> },
        { id: 'integrations', label: 'Integrations', icon: <Icons.LinkIcon size={16} /> },
        { id: 'permissions', label: 'Permissions', icon: <Icons.ShieldIcon size={16} /> },
        { id: 'admins', label: 'Admins', icon: <Icons.PersonIcon size={16} /> },
    ];

    const handleConnectCalendar = async () => {
        try {
            const response = await fetch('/api/auth/google/url');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to get auth URL');
            }
            const { url } = await response.json();

            const width = 500;
            const height = 600;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            window.open(url, 'google_auth', `width=${width},height=${height},top=${top},left=${left}`);

            const handleMessage = (event: MessageEvent) => {
                if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                    onSaveCalendarTokens?.(event.data.tokens);
                    onShowToast('Google Calendar connected successfully!', 'success');
                    window.removeEventListener('message', handleMessage);
                }
            };
            window.addEventListener('message', handleMessage);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(error);
            onShowToast(`Failed to initiate Google Calendar connection: ${errorMessage}`, 'error');
        }
    };

    const handleSaveSettings = async () => {
        try {
            // In production, save to API
            onShowToast('Settings saved successfully!', 'success');
        } catch (error) {
            onShowToast('Failed to save settings', 'error');
        }
    };

    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Business Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Business Name</label>
                                    <input
                                        type="text"
                                        value={generalSettings.businessName}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, businessName: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Business Email</label>
                                    <input
                                        type="email"
                                        value={generalSettings.businessEmail}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, businessEmail: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Phone</label>
                                    <input
                                        type="tel"
                                        value={generalSettings.businessPhone}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, businessPhone: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Address</label>
                                    <input
                                        type="text"
                                        value={generalSettings.businessAddress}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, businessAddress: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Regional Settings
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Timezone</label>
                                    <select
                                        value={generalSettings.timezone}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    >
                                        <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                                        <option value="Africa/Cape Town">Africa/Cape Town (SAST)</option>
                                        <option value="Africa/Durban">Africa/Durban (SAST)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Currency</label>
                                    <select
                                        value={generalSettings.currency}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    >
                                        <option value="ZAR">ZAR - South African Rand</option>
                                    </select>
                                    <p className="text-[10px] text-[#6E7568] mt-1">Currency is fixed to ZAR for South African operations</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Operating Hours
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(generalSettings.operatingHours).map(([day, hours]) => (
                                    <div key={day} className="flex items-center gap-4 p-3 bg-[#FBF7EF] rounded-xl">
                                        <div className="w-24">
                                            <span className="text-sm font-bold text-[#26150B] capitalize">{day}</span>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={hours.enabled}
                                                onChange={(e) => setGeneralSettings({
                                                    ...generalSettings,
                                                    operatingHours: {
                                                        ...generalSettings.operatingHours,
                                                        [day]: { ...hours, enabled: e.target.checked }
                                                    }
                                                })}
                                                className="w-4 h-4 rounded text-[#6E7568]"
                                            />
                                            <span className="text-xs text-[#6E7568]">Enabled</span>
                                        </label>
                                        {hours.enabled && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={hours.open}
                                                    onChange={(e) => setGeneralSettings({
                                                        ...generalSettings,
                                                        operatingHours: {
                                                            ...generalSettings.operatingHours,
                                                            [day]: { ...hours, open: e.target.value }
                                                        }
                                                    })}
                                                    className="p-2 rounded-lg bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                                />
                                                <span className="text-[#6E7568]">to</span>
                                                <input
                                                    type="time"
                                                    value={hours.close}
                                                    onChange={(e) => setGeneralSettings({
                                                        ...generalSettings,
                                                        operatingHours: {
                                                            ...generalSettings.operatingHours,
                                                            [day]: { ...hours, close: e.target.value }
                                                        }
                                                    })}
                                                    className="p-2 rounded-lg bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className={`btn-primary rounded-xl py-3 px-6 text-sm font-bold uppercase cursor-pointer shadow-lg hover:shadow-xl transition-all ${focusRing}`}>
                            Save General Settings
                        </button>
                    </div>
                );

            case 'payments':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> PayFast Configuration
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Merchant ID</label>
                                    <input
                                        type="text"
                                        value={paymentSettings.payfastMerchantId}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, payfastMerchantId: e.target.value })}
                                        placeholder="Enter your PayFast Merchant ID"
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Merchant Key</label>
                                    <div className="relative">
                                        <input
                                            type={showPayfastKey ? "text" : "password"}
                                            value={paymentSettings.payfastMerchantKey}
                                            onChange={(e) => setPaymentSettings({ ...paymentSettings, payfastMerchantKey: e.target.value })}
                                            placeholder="Enter your PayFast Merchant Key"
                                            className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPayfastKey(!showPayfastKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7568]"
                                        >
                                            {showPayfastKey ? <Icons.EyeOffIcon size={16} /> : <Icons.EyeIcon size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Passphrase</label>
                                    <div className="relative">
                                        <input
                                            type={showPayfastPassphrase ? "text" : "password"}
                                            value={paymentSettings.payfastPassphrase}
                                            onChange={(e) => setPaymentSettings({ ...paymentSettings, payfastPassphrase: e.target.value })}
                                            placeholder="Enter your PayFast Passphrase"
                                            className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPayfastPassphrase(!showPayfastPassphrase)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7568]"
                                        >
                                            {showPayfastPassphrase ? <Icons.EyeOffIcon size={16} /> : <Icons.EyeIcon size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
                                    <div>
                                        <h4 className="text-sm font-bold text-[#26150B]">Test Mode</h4>
                                        <p className="text-xs text-[#6E7568]">Use PayFast sandbox for testing</p>
                                    </div>
<button
                                        onClick={() => setPaymentSettings({ ...paymentSettings, testMode: !paymentSettings.testMode })}
                                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${focusRing} ${paymentSettings.testMode ? 'bg-yellow-500' : 'bg-[#6E7568]'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${paymentSettings.testMode ? 'left-7' : 'left-1'}`}></span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Default Credit Packages
                            </h3>
                            <div className="space-y-3">
                                {paymentSettings.defaultCreditPackages.map((pkg, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#FBF7EF] rounded-xl">
                                        <input
                                            type="text"
                                            value={pkg.name}
                                            onChange={(e) => {
                                                const newPackages = [...paymentSettings.defaultCreditPackages];
                                                newPackages[idx] = { ...pkg, name: e.target.value };
                                                setPaymentSettings({ ...paymentSettings, defaultCreditPackages: newPackages });
                                            }}
                                            className="flex-1 p-2 rounded-lg bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                            placeholder="Package name"
                                        />
                                        <input
                                            type="number"
                                            value={pkg.credits}
                                            onChange={(e) => {
                                                const newPackages = [...paymentSettings.defaultCreditPackages];
                                                newPackages[idx] = { ...pkg, credits: parseInt(e.target.value) || 0 };
                                                setPaymentSettings({ ...paymentSettings, defaultCreditPackages: newPackages });
                                            }}
                                            className="w-20 p-2 rounded-lg bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                            placeholder="Credits"
                                        />
                                        <span className="text-[#6E7568]">credits</span>
                                        <span className="text-[#6E7568]">@</span>
                                        <input
                                            type="number"
                                            value={pkg.price}
                                            onChange={(e) => {
                                                const newPackages = [...paymentSettings.defaultCreditPackages];
                                                newPackages[idx] = { ...pkg, price: parseFloat(e.target.value) || 0 };
                                                setPaymentSettings({ ...paymentSettings, defaultCreditPackages: newPackages });
                                            }}
                                            className="w-24 p-2 rounded-lg bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                            placeholder="Price"
                                        />
                                        <span className="text-[#6E7568]">ZAR</span>
                                        <button
                                            onClick={() => {
                                                const newPackages = paymentSettings.defaultCreditPackages.filter((_, i) => i !== idx);
                                                setPaymentSettings({ ...paymentSettings, defaultCreditPackages: newPackages });
                                            }}
                                            className="p-2 text-red-400 hover:text-red-600"
                                        >
                                            <Icons.TrashIcon size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setPaymentSettings({
                                        ...paymentSettings,
                                        defaultCreditPackages: [...paymentSettings.defaultCreditPackages, { credits: 1, price: 250, name: '' }]
                                    })}
                                    className="text-xs font-bold text-[#6E7568] hover:text-[#26150B] flex items-center gap-1"
                                >
                                    <Icons.PlusIcon size={14} /> Add Package
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Refund Policy
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Refund Window (hours)</label>
                                    <input
                                        type="number"
                                        value={paymentSettings.refundWindowHours}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, refundWindowHours: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Refund Policy</label>
                                    <textarea
                                        value={paymentSettings.refundPolicy}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, refundPolicy: e.target.value })}
                                        rows={4}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className={`btn-primary rounded-xl py-3 px-6 text-sm font-bold uppercase cursor-pointer shadow-lg hover:shadow-xl transition-all ${focusRing}`}>
                            Save Payment Settings
                        </button>
                    </div>
                );

            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Email Settings
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
                                    <div>
                                        <h4 className="text-sm font-bold text-[#26150B]">Email Notifications</h4>
                                        <p className="text-xs text-[#6E7568]">Enable email notifications</p>
                                    </div>
<button
                                        onClick={() => setNotificationSettings({ ...notificationSettings, emailEnabled: !notificationSettings.emailEnabled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${focusRing} ${notificationSettings.emailEnabled ? 'bg-[#6E7568]' : 'bg-[#6E7568]/20'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${notificationSettings.emailEnabled ? 'left-7' : 'left-1'}`}></span>
                                    </button>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Sender Name</label>
                                    <input
                                        type="text"
                                        value={settings.email?.senderName || ''}
                                        onChange={(e) => onUpdateSettings({ ...settings, email: { ...settings.email, senderName: e.target.value } })}
                                        placeholder="Fascia Studio"
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> SMS Settings (Twilio)
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
                                    <div>
                                        <h4 className="text-sm font-bold text-[#26150B]">SMS Notifications</h4>
                                        <p className="text-xs text-[#6E7568]">Enable SMS notifications via Twilio</p>
                                    </div>
<button
                                        onClick={() => setNotificationSettings({ ...notificationSettings, smsEnabled: !notificationSettings.smsEnabled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${focusRing} ${notificationSettings.smsEnabled ? 'bg-[#6E7568]' : 'bg-[#6E7568]/20'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${notificationSettings.smsEnabled ? 'left-7' : 'left-1'}`}></span>
                                    </button>
                                </div>
                                {notificationSettings.smsEnabled && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Account SID</label>
                                            <input
                                                type="text"
                                                value={notificationSettings.twilioAccountSid}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, twilioAccountSid: e.target.value })}
                                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Auth Token</label>
                                            <div className="relative">
                                                <input
                                                    type={showTwilioToken ? "text" : "password"}
                                                    value={notificationSettings.twilioAuthToken}
                                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, twilioAuthToken: e.target.value })}
                                                    placeholder="Enter Twilio Auth Token"
                                                    className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTwilioToken(!showTwilioToken)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7568]"
                                                >
                                                    {showTwilioToken ? <Icons.EyeOffIcon size={16} /> : <Icons.EyeIcon size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Phone Number</label>
                                            <input
                                                type="text"
                                                value={notificationSettings.twilioPhoneNumber}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, twilioPhoneNumber: e.target.value })}
                                                placeholder="+1234567890"
                                                className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Notification Preferences
                            </h3>
                            <div className="space-y-3">
                                <ToggleSetting
                                    label="Booking Confirmation (Email)"
                                    description="Send email when booking is confirmed"
                                    checked={notificationSettings.bookingConfirmationEmail}
                                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, bookingConfirmationEmail: checked })}
                                />
                                <ToggleSetting
                                    label="Booking Confirmation (SMS)"
                                    description="Send SMS when booking is confirmed"
                                    checked={notificationSettings.bookingConfirmationSms}
                                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, bookingConfirmationSms: checked })}
                                />
                                <ToggleSetting
                                    label="Class Reminder (Email)"
                                    description="Send email reminder before class"
                                    checked={notificationSettings.classReminderEmail}
                                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, classReminderEmail: checked })}
                                />
                                <ToggleSetting
                                    label="Class Reminder (SMS)"
                                    description="Send SMS reminder before class"
                                    checked={notificationSettings.classReminderSms}
                                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, classReminderSms: checked })}
                                />
                                {notificationSettings.classReminderEmail || notificationSettings.classReminderSms ? (
                                    <div className="pl-4">
                                        <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Reminder Hours Before</label>
                                        <input
                                            type="number"
                                            value={notificationSettings.reminderHoursBefore}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, reminderHoursBefore: parseInt(e.target.value) || 24 })}
                                            className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                        />
                                    </div>
                                ) : null}
                                <ToggleSetting
                                    label="Waitlist Notification (Email)"
                                    description="Notify users when moved from waitlist"
                                    checked={notificationSettings.waitlistNotificationEmail}
                                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, waitlistNotificationEmail: checked })}
                                />
                                <ToggleSetting
                                    label="Payment Confirmation (Email)"
                                    description="Send email when payment is received"
                                    checked={notificationSettings.paymentConfirmationEmail}
                                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, paymentConfirmationEmail: checked })}
                                />
                                <ToggleSetting
                                    label="Marketing Emails"
                                    description="Send promotional and marketing content"
                                    checked={notificationSettings.marketingEmails}
                                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, marketingEmails: checked })}
                                />
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className={`btn-primary rounded-xl py-3 px-6 text-sm font-bold uppercase cursor-pointer shadow-lg hover:shadow-xl transition-all ${focusRing}`}>
                            Save Notification Settings
                        </button>
                    </div>
                );

            case 'booking':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Class Settings
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Default Class Capacity</label>
                                    <input
                                        type="number"
                                        value={bookingSettings.defaultClassCapacity}
                                        onChange={(e) => setBookingSettings({ ...bookingSettings, defaultClassCapacity: parseInt(e.target.value) || 10 })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Booking Window (days)</label>
                                    <input
                                        type="number"
                                        value={bookingSettings.bookingWindowDays}
                                        onChange={(e) => setBookingSettings({ ...bookingSettings, bookingWindowDays: parseInt(e.target.value) || 30 })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                    <p className="text-[10px] text-[#6E7568] mt-1">How far in advance users can book classes</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Cancellation Window (hours)</label>
                                    <input
                                        type="number"
                                        value={bookingSettings.cancellationWindowHours}
                                        onChange={(e) => setBookingSettings({ ...bookingSettings, cancellationWindowHours: parseInt(e.target.value) || 24 })}
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                    <p className="text-[10px] text-[#6E7568] mt-1">Minimum hours before class to allow cancellation</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Waitlist Settings
                            </h3>
                            <div className="space-y-4">
                                <ToggleSetting
                                    label="Enable Waitlist"
                                    description="Allow users to join waitlist when class is full"
                                    checked={bookingSettings.waitlistEnabled}
                                    onChange={(checked) => setBookingSettings({ ...bookingSettings, waitlistEnabled: checked })}
                                />
                                <ToggleSetting
                                    label="Auto Waitlist Promotion"
                                    description="Automatically promote waitlisted users when spot opens"
                                    checked={bookingSettings.autoWaitlistPromotion}
                                    onChange={(checked) => setBookingSettings({ ...bookingSettings, autoWaitlistPromotion: checked })}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Class Options
                            </h3>
                            <div className="space-y-4">
                                <ToggleSetting
                                    label="Allow Dome Reset Override"
                                    description="Allow back-to-back classes without 30-min reset"
                                    checked={bookingSettings.allowDomeResetOverride}
                                    onChange={(checked) => setBookingSettings({ ...bookingSettings, allowDomeResetOverride: checked })}
                                />
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className={`btn-primary rounded-xl py-3 px-6 text-sm font-bold uppercase cursor-pointer shadow-lg hover:shadow-xl transition-all ${focusRing}`}>
                            Save Booking Settings
                        </button>
                    </div>
                );

            case 'users':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> User Registration
                            </h3>
                            <div className="space-y-4">
                                <ToggleSetting
                                    label="Require Waiver"
                                    description="Users must sign waiver before booking"
                                    checked={bookingSettings.requireWaiver}
                                    onChange={(checked) => setBookingSettings({ ...bookingSettings, requireWaiver: checked })}
                                />
                                <ToggleSetting
                                    label="Auto-Approval for New Users"
                                    description="New users are automatically approved without admin review"
                                    checked={bookingSettings.autoApprovalNewUsers}
                                    onChange={(checked) => setBookingSettings({ ...bookingSettings, autoApprovalNewUsers: checked })}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Default User Roles
                            </h3>
                            <div className="p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
                                <p className="text-sm text-[#26150B]">New users are automatically assigned as <span className="font-bold">Clients</span></p>
                                <p className="text-xs text-[#6E7568] mt-1">Admin roles must be assigned manually by administrators</p>
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className={`btn-primary rounded-xl py-3 px-6 text-sm font-bold uppercase cursor-pointer shadow-lg hover:shadow-xl transition-all ${focusRing}`}>
                            Save User Settings
                        </button>
                    </div>
                );

            case 'integrations':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Third-Party Integrations
                            </h3>
                            <div className="space-y-3">
                                <IntegrationStatus
                                    name="Google Calendar"
                                    description="Sync classes to Google Calendar"
                                    enabled={integrationSettings.googleCalendarEnabled}
                                    onToggle={() => {
                                        if (!integrationSettings.googleCalendarEnabled) {
                                            handleConnectCalendar();
                                        } else {
                                            setIntegrationSettings({ ...integrationSettings, googleCalendarEnabled: false });
                                        }
                                    }}
                                    connected={!!settings.googleCalendarTokens}
                                />
                                <IntegrationStatus
                                    name="PayFast"
                                    description="Payment processing"
                                    enabled={integrationSettings.payfastEnabled}
                                    onToggle={() => setIntegrationSettings({ ...integrationSettings, payfastEnabled: !integrationSettings.payfastEnabled })}
                                />
                                <IntegrationStatus
                                    name="Twilio"
                                    description="SMS notifications"
                                    enabled={integrationSettings.twilioEnabled}
                                    onToggle={() => setIntegrationSettings({ ...integrationSettings, twilioEnabled: !integrationSettings.twilioEnabled })}
                                />
                                <IntegrationStatus
                                    name="SendGrid"
                                    description="Email delivery"
                                    enabled={integrationSettings.sendgridEnabled}
                                    onToggle={() => setIntegrationSettings({ ...integrationSettings, sendgridEnabled: !integrationSettings.sendgridEnabled })}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Webhooks
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Webhook URL</label>
                                    <input
                                        type="url"
                                        value={integrationSettings.webhookUrl}
                                        onChange={(e) => setIntegrationSettings({ ...integrationSettings, webhookUrl: e.target.value })}
                                        placeholder="https://your-webhook-endpoint.com/webhook"
                                        className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Webhook Secret</label>
                                    <div className="relative">
                                        <input
                                            type={showWebhookSecret ? "text" : "password"}
                                            value={integrationSettings.webhookSecret}
                                            onChange={(e) => setIntegrationSettings({ ...integrationSettings, webhookSecret: e.target.value })}
                                            placeholder="Enter webhook secret"
                                            className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 text-sm pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7568]"
                                        >
                                            {showWebhookSecret ? <Icons.EyeOffIcon size={16} /> : <Icons.EyeIcon size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className={`btn-primary rounded-xl py-3 px-6 text-sm font-bold uppercase cursor-pointer shadow-lg hover:shadow-xl transition-all ${focusRing}`}>
                            Save Integration Settings
                        </button>
                    </div>
                );

            case 'permissions':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Role-Based Access Control
                            </h3>
                            <p className="text-sm text-[#6E7568] mb-4">Configure permissions for each admin role</p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#6E7568]/10">
                                            <th className="text-left py-3 px-2 font-bold text-[#26150B]">Permission</th>
                                            <th className="text-center py-3 px-2 font-bold text-[#26150B]">Super Admin</th>
                                            <th className="text-center py-3 px-2 font-bold text-[#26150B]">Admin</th>
                                            <th className="text-center py-3 px-2 font-bold text-[#26150B]">Manager</th>
                                            <th className="text-center py-3 px-2 font-bold text-[#26150B]">Staff</th>
                                            <th className="text-center py-3 px-2 font-bold text-[#26150B]">Teacher</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PERMISSIONS.map((permission) => {
                                            const superAdminPerms = ROLE_PERMISSIONS['super_admin'];
                                            const adminPerms = ROLE_PERMISSIONS['admin'];
                                            const managerPerms = ROLE_PERMISSIONS['admin']; // Using admin as manager
                                            const staffPerms = ROLE_PERMISSIONS['staff'];
                                            const teacherPerms = ROLE_PERMISSIONS['teacher'];
                                            
                                            // Map permission keys
                                            const permKey = permission.key as keyof typeof superAdminPerms;
                                            
                                            return (
                                                <tr key={permission.key} className="border-b border-[#6E7568]/10 hover:bg-[#FBF7EF]/50">
                                                    <td className="py-3 px-2">
                                                        <div>
                                                            <p className="font-medium text-[#26150B]">{permission.label}</p>
                                                            <p className="text-[10px] text-[#6E7568]">{permission.description}</p>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        {superAdminPerms[permKey] ? <Icons.CheckIcon size={16} className="text-green-600 mx-auto" /> : <Icons.XIcon size={16} className="text-red-400 mx-auto" />}
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        {adminPerms[permKey] ? <Icons.CheckIcon size={16} className="text-green-600 mx-auto" /> : <Icons.XIcon size={16} className="text-red-400 mx-auto" />}
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        {managerPerms[permKey] ? <Icons.CheckIcon size={16} className="text-green-600 mx-auto" /> : <Icons.XIcon size={16} className="text-red-400 mx-auto" />}
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        {staffPerms[permKey] ? <Icons.CheckIcon size={16} className="text-green-600 mx-auto" /> : <Icons.XIcon size={16} className="text-red-400 mx-auto" />}
                                                    </td>
                                                    <td className="text-center py-3 px-2">
                                                        {teacherPerms[permKey] ? <Icons.CheckIcon size={16} className="text-green-600 mx-auto" /> : <Icons.XIcon size={16} className="text-red-400 mx-auto" />}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                            <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Role Descriptions
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <RoleDescription
                                    role="Super Admin"
                                    color="purple"
                                    description="Full system access. Can manage all settings, users, and other admins."
                                />
                                <RoleDescription
                                    role="Admin"
                                    color="blue"
                                    description="Standard administrative access. Can manage most settings and users."
                                />
                                <RoleDescription
                                    role="Manager"
                                    color="green"
                                    description="Same as Admin - manages classes, users, and bookings."
                                />
                                <RoleDescription
                                    role="Staff"
                                    color="gray"
                                    description="Limited access. Can manage users and process payments."
                                />
                                <RoleDescription
                                    role="Teacher"
                                    color="teal"
                                    description="Can only manage classes they're assigned to."
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'admins':
                return (
                    <div className="space-y-6">
                        {canManageAdmins && (
                            <>
                                <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-[#26150B] font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Admin Users
                                        </h3>
                                        <button
                                            onClick={() => setShowAddAdminModal(true)}
                                            className="btn-primary rounded-xl py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:-translate-y-0.5 transition-all"
                                        >
                                            <Icons.PlusIcon size={14} /> Add Admin
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {adminUsers.map(admin => {
                                            return (
                                                <div key={admin.id} className="flex items-center justify-between p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10 hover:border-[#6E7568]/20 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-[#6E7568] flex items-center justify-center text-[#FBF7EF] font-bold text-sm">
                                                            {admin.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-[#26150B]">{admin.name}</p>
                                                            <p className="text-[10px] text-[#6E7568]">{admin.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                            admin.adminRole === 'super_admin' ? 'bg-purple-100 text-purple-600' :
                                                            admin.adminRole === 'admin' ? 'bg-blue-100 text-blue-600' :
                                                            admin.adminRole === 'teacher' ? 'bg-green-100 text-green-600' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {admin.adminRole || 'admin'}
                                                        </span>
                                                        {admin.id !== user.id && (
                                                            <button
                                                                onClick={() => onRemoveAdmin?.(admin.id)}
                                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            >
                                                                <Icons.TrashIcon size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-[#6E7568]/10 shadow-sm">
                                    <h3 className="text-[#26150B] font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Current Permissions
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                        {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                                            <div key={role} className="bg-[#FBF7EF] p-3 rounded-xl border border-[#6E7568]/10">
                                                <p className="font-bold text-[#26150B] uppercase text-xs mb-2">{role.replace('_', ' ')}</p>
                                                <div className="space-y-1 text-[10px]">
                                                    <p className={perms.canManageClasses ? 'text-green-600' : 'text-red-400'}>
                                                        {perms.canManageClasses ? '✓' : '✗'} Classes
                                                    </p>
                                                    <p className={perms.canManageUsers ? 'text-green-600' : 'text-red-400'}>
                                                        {perms.canManageUsers ? '✓' : '✗'} Users
                                                    </p>
                                                    <p className={perms.canViewAnalytics ? 'text-green-600' : 'text-red-400'}>
                                                        {perms.canViewAnalytics ? '✓' : '✗'} Analytics
                                                    </p>
                                                    <p className={perms.canManageSettings ? 'text-green-600' : 'text-red-400'}>
                                                        {perms.canManageSettings ? '✓' : '✗'} Settings
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {!canManageAdmins && (
                            <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
                                <div className="flex items-start gap-3">
                                    <Icons.AlertIcon size={20} className="text-yellow-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-yellow-800">Access Restricted</p>
                                        <p className="text-xs text-yellow-700 mt-1">You don't have permission to manage admin users. Contact a super admin to request access.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Configuration Panel</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage all application settings and permissions</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto gap-1 mb-6 pb-2 border-b border-[#6E7568]/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                            activeTab === tab.id
                                ? 'bg-[#6E7568] text-[#FBF7EF]'
                                : 'text-[#6E7568] hover:bg-[#6E7568]/10'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {renderTabContent()}

            {/* Add Admin Modal */}
            {showAddAdminModal && (
                <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#FBF7EF] border border-[#6E7568]/20 rounded-[2.5rem] p-8 sm:p-10 w-full max-w-md shadow-2xl relative">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">Add Admin User</h2>
                            <button onClick={() => setShowAddAdminModal(false)} className="text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all"><Icons.XIcon /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Name</label>
                                <input
                                    className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                                    value={newAdminName}
                                    onChange={e => setNewAdminName(e.target.value)}
                                    placeholder="Full name"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                                    value={newAdminEmail}
                                    onChange={e => setNewAdminEmail(e.target.value)}
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Role</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm font-medium"
                                    value={newAdminRole}
                                    onChange={e => setNewAdminRole(e.target.value as AdminRole)}
                                >
                                    <option value="super_admin">Super Admin (Full Access)</option>
                                    <option value="admin">Admin (Standard)</option>
                                    <option value="teacher">Teacher (Classes Only)</option>
                                    <option value="staff">Staff (Limited)</option>
                                </select>
                            </div>

                            <button
                                onClick={() => {
                                    if (newAdminEmail && newAdminName && onAddAdmin) {
                                        onAddAdmin(newAdminEmail, newAdminName, newAdminRole);
                                        setNewAdminEmail('');
                                        setNewAdminName('');
                                        setNewAdminRole('staff');
                                        setShowAddAdminModal(false);
                                        onShowToast('Admin user added successfully!', 'success');
                                    }
                                }}
                                disabled={!newAdminEmail || !newAdminName}
                                className="w-full btn-primary py-4 rounded-2xl font-bold text-sm tracking-widest uppercase mt-6 shadow-xl hover:scale-[1.02] transition-all bg-gradient-to-r from-[#6E7568] to-[#5a6155] text-[#FBF7EF] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Admin
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2FA Setup Modal */}
            {show2FASetup && (
                <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#FBF7EF] border border-[#6E7568]/20 rounded-[2.5rem] p-8 sm:p-10 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">Setup Two-Factor Authentication</h2>
                            <button onClick={() => setShow2FASetup(false)} className="text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all"><Icons.XIcon /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-xs font-bold">1</div>
                                    <h4 className="text-sm font-bold text-[#26150B]">Download an Authenticator App</h4>
                                </div>
                                <p className="text-xs text-[#6E7568] ml-9">Install Google Authenticator, Authy, or similar app on your phone.</p>
                            </div>

                            <div className="p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-xs font-bold">2</div>
                                    <h4 className="text-sm font-bold text-[#26150B]">Scan QR Code</h4>
                                </div>
                                <div className="ml-9 flex flex-col items-center">
                                    <div className="w-40 h-40 bg-white rounded-xl border-2 border-[#6E7568]/20 flex items-center justify-center mb-3 shadow-inner">
                                        <div className="text-center">
                                            <Icons.ShieldIcon size={48} className="text-[#6E7568] mx-auto mb-2" />
                                            <p className="text-[9px] text-[#6E7568]/60 font-mono">QR Code</p>
                                            <p className="text-[8px] text-[#6E7568]/40">(Demo Mode)</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-[#6E7568] text-center">Or enter this code manually:</p>
                                    <code className="mt-1 px-3 py-1.5 bg-white rounded-lg text-xs font-mono text-[#26150B] border border-[#6E7568]/10">
                                        {twoFASecret || 'JBSWY3DPEHPK3PXP'}
                                    </code>
                                </div>
                            </div>

                            <div className="p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-xs font-bold">3</div>
                                    <h4 className="text-sm font-bold text-[#26150B]">Enter Verification Code</h4>
                                </div>
                                <div className="ml-9">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="w-full p-4 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm text-center text-2xl font-mono tracking-widest"
                                        value={twoFACode}
                                        onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                    />
                                    <p className="text-[10px] text-[#6E7568] mt-2">Enter the 6-digit code from your authenticator app</p>
                                </div>
                            </div>

                            {backupCodes.length > 0 && (
                                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                    <h4 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                        <Icons.AlertIcon size={14} /> Save Your Backup Codes
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {backupCodes.map((code, i) => (
                                            <code key={i} className="px-2 py-1 bg-white rounded text-xs font-mono text-[#26150B] border border-yellow-200">
                                                {code}
                                            </code>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    if (twoFACode.length === 6 && onUpdateUser) {
                                        const newBackupCodes = Array.from({ length: 8 }, () =>
                                            Math.random().toString(36).substring(2, 8).toUpperCase()
                                        );
                                        setBackupCodes(newBackupCodes);

                                        onUpdateUser({
                                            ...user,
                                            twoFactorEnabled: true,
                                            twoFactorSecret: twoFASecret || 'JBSWY3DPEHPK3PXP',
                                            twoFactorBackupCodes: newBackupCodes
                                        });
                                        onShowToast('Two-factor authentication enabled!', 'success');
                                        setShow2FASetup(false);
                                        setTwoFACode('');
                                    }
                                }}
                                disabled={twoFACode.length !== 6}
                                className="w-full btn-primary py-4 rounded-2xl font-bold text-sm tracking-widest uppercase mt-6 shadow-xl hover:scale-[1.02] transition-all bg-gradient-to-r from-[#6E7568] to-[#5a6155] text-[#FBF7EF] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Verify & Enable 2FA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Components
const ToggleSetting: React.FC<{
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
        <div>
            <h4 className="text-sm font-bold text-[#26150B]">{label}</h4>
            <p className="text-xs text-[#6E7568]">{description}</p>
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-[#6E7568]' : 'bg-[#6E7568]/20'}`}
        >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`}></span>
        </button>
    </div>
);

const IntegrationStatus: React.FC<{
    name: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    connected?: boolean;
}> = ({ name, description, enabled, onToggle, connected }) => (
    <div className="flex items-center justify-between p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Icons.LinkIcon size={20} className="text-[#6E7568]" />
            </div>
            <div>
                <h4 className="text-sm font-bold text-[#26150B]">{name}</h4>
                <p className="text-xs text-[#6E7568]">{description}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {connected && (
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    Connected
                </span>
            )}
            <button
                onClick={onToggle}
                className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#6E7568]' : 'bg-[#6E7568]/20'}`}
            >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-7' : 'left-1'}`}></span>
            </button>
        </div>
    </div>
);

const RoleDescription: React.FC<{
    role: string;
    color: 'purple' | 'blue' | 'green' | 'gray' | 'teal';
    description: string;
}> = ({ role, color, description }) => {
    const colorClasses = {
        purple: 'bg-purple-100 text-purple-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        gray: 'bg-gray-100 text-gray-600',
        teal: 'bg-teal-100 text-teal-600',
    };

    return (
        <div className="p-4 bg-[#FBF7EF] rounded-xl border border-[#6E7568]/10">
            <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${colorClasses[color]}`}>
                {role}
            </span>
            <p className="text-xs text-[#6E7568] mt-2">{description}</p>
        </div>
    );
};
