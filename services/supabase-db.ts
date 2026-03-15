// Supabase Database Service
// Handles persistence to Supabase for app_settings and calendar sync
//
// Required environment variables (in .env file):
//   VITE_SUPABASE_URL - Your Supabase project URL
//   VITE_SUPABASE_ANON_KEY - Your Supabase anon/public key

import { AppSettings, Class } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file'
  );
}

// Helper for API calls
async function supabaseRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// Settings Service
export const settingsService = {
  // Get settings from Supabase
  async getSettings(): Promise<AppSettings | null> {
    try {
      const data = await supabaseRequest('app_settings?id=eq.1');
      if (data && data.length > 0) {
        const row = data[0];
        return {
          appName: row.app_name,
          contactEmail: row.contact_email,
          additionalContactEmails: row.additional_contact_emails || [],
          zapperQrBase64: row.zapper_qr_base64,
          landingPage: row.landing_page || {
            headerText: 'where fascia becomes FLUID',
            subheaderText: 'Step into the Dome',
            expectations: []
          },
          email: row.email_config || {
            provider: 'mock',
            apiKey: '',
            senderName: 'Pause Admin',
            senderEmail: 'hello@pausefmd.co.za',
            waitlistTemplate: ''
          },
          googleCalendarTokens: row.google_calendar_tokens,
          googleCalendarId: row.google_calendar_id,
          googleCalendarSyncEnabled: row.google_calendar_sync_enabled || false,
          googleCalendarLastSync: row.google_calendar_last_sync
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to load settings from Supabase:', error);
      return null;
    }
  },

  // Update settings in Supabase
  async updateSettings(settings: AppSettings): Promise<boolean> {
    try {
      await supabaseRequest('app_settings?id=eq.1', {
        method: 'PATCH',
        body: JSON.stringify({
          app_name: settings.appName,
          contact_email: settings.contactEmail,
          additional_contact_emails: settings.additionalContactEmails,
          zapper_qr_base64: settings.zapperQrBase64,
          landing_page: settings.landingPage,
          email_config: settings.email,
          google_calendar_tokens: settings.googleCalendarTokens,
          google_calendar_id: settings.googleCalendarId,
          google_calendar_sync_enabled: settings.googleCalendarSyncEnabled,
          google_calendar_last_sync: settings.googleCalendarLastSync,
          updated_at: new Date().toISOString()
        }),
      });
      return true;
    } catch (error) {
      console.error('Failed to save settings to Supabase:', error);
      return false;
    }
  }
};

// Calendar Sync Service
export const calendarService = {
  // Save calendar tokens
  async saveCalendarTokens(tokens: any): Promise<boolean> {
    try {
      await supabaseRequest('app_settings?id=eq.1', {
        method: 'PATCH',
        body: JSON.stringify({
          google_calendar_tokens: tokens,
          updated_at: new Date().toISOString()
        }),
      });
      return true;
    } catch (error) {
      console.error('Failed to save calendar tokens:', error);
      return false;
    }
  },

  // Sync a class to Google Calendar
  async syncClassToCalendar(cls: Class, settings: AppSettings): Promise<boolean> {
    if (!settings.googleCalendarSyncEnabled || !settings.googleCalendarTokens) {
      return false;
    }

    try {
      // Call the server API to sync to Google Calendar
      const response = await fetch('/api/calendar/sync-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class: cls,
          calendarId: settings.googleCalendarId,
          tokens: settings.googleCalendarTokens
        })
      });

      if (response.ok) {
        // Update last sync timestamp
        await supabaseRequest('app_settings?id=eq.1', {
          method: 'PATCH',
          body: JSON.stringify({
            google_calendar_last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }),
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to sync class to calendar:', error);
      return false;
    }
  },

  // Remove a class from Google Calendar
  async removeClassFromCalendar(classId: string, settings: AppSettings): Promise<boolean> {
    if (!settings.googleCalendarTokens) {
      return false;
    }

    try {
      const response = await fetch('/api/calendar/remove-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          calendarId: settings.googleCalendarId,
          tokens: settings.googleCalendarTokens
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to remove class from calendar:', error);
      return false;
    }
  }
};

// Initialize settings from Supabase on app start
export async function initializeSettings(): Promise<AppSettings | null> {
  return await settingsService.getSettings();
}
