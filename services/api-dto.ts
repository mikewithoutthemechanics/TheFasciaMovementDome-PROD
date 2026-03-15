/**
 * Response DTOs and Transformation Functions
 * 
 * PERF-002: Large Data Serialization Fix
 * Filters out sensitive fields from database objects before sending to clients
 * to prevent data exposure and reduce bandwidth usage.
 */

import type { User, AppSettings } from '../types';

// =============================================================================
// USER DTOs - Remove sensitive security fields
// =============================================================================

/**
 * Public-facing user response (DTO)
 * Excludes sensitive security fields like 2FA secrets and waiver metadata
 */
export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin: boolean;
  adminRole?: string;
  sport?: string;
  waiverAccepted?: boolean;
  medicalCleared?: boolean;
  heatAcknowledged?: boolean;
  waiverDate?: string;
  credits?: number;
  injuries?: User['injuries'];
  healthConditions?: string[];
  movementExperience?: 'beginner' | 'intermediate' | 'advanced';
  twoFactorEnabled?: boolean;
}

/**
 * Transform a full User object to a safe response DTO
 * Filters out sensitive security fields
 */
export function toUserResponse(user: User): UserResponseDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isAdmin: user.isAdmin,
    adminRole: user.adminRole,
    sport: user.sport,
    waiverAccepted: user.waiverAccepted,
    medicalCleared: user.medicalCleared,
    heatAcknowledged: user.heatAcknowledged,
    waiverDate: user.waiverDate,
    credits: user.credits,
    injuries: user.injuries,
    healthConditions: user.healthConditions,
    movementExperience: user.movementExperience,
    twoFactorEnabled: user.twoFactorEnabled,
    // EXCLUDED (sensitive):
    // - twoFactorSecret
    // - twoFactorBackupCodes  
    // - waiverData (contains ipAddress, userAgent)
  };
}

/**
 * Transform an array of users to DTOs
 */
export function toUserResponseList(users: User[]): UserResponseDTO[] {
  return users.map(toUserResponse);
}

// =============================================================================
// SETTINGS DTOs - Remove sensitive configuration
// =============================================================================

/**
 * Public-facing settings response (DTO)
 * Excludes sensitive OAuth tokens and payment QR codes
 */
export interface SettingsResponseDTO {
  appName: string;
  contactEmail: string;
  additionalContactEmails: string[];
  landingPage: AppSettings['landingPage'];
  email: {
    provider: string;
    senderName: string;
    senderEmail: string;
  };
  googleCalendarSyncEnabled: boolean;
  googleCalendarId?: string;
}

/**
 * Transform full AppSettings to a safe response DTO
 * Filters out OAuth tokens and payment QR codes
 */
export function toSettingsResponse(settings: AppSettings): SettingsResponseDTO {
  return {
    appName: settings.appName,
    contactEmail: settings.contactEmail,
    additionalContactEmails: settings.additionalContactEmails || [],
    landingPage: settings.landingPage,
    email: {
      provider: settings.email?.provider || 'mock',
      senderName: settings.email?.senderName || 'Pause Admin',
      senderEmail: settings.email?.senderEmail || 'hello@pausefmd.co.za',
    },
    googleCalendarSyncEnabled: settings.googleCalendarSyncEnabled || false,
    googleCalendarId: settings.googleCalendarId,
    // EXCLUDED (sensitive):
    // - googleCalendarTokens (OAuth credentials)
    // - zapperQrBase64 (payment QR code)
  };
}

// =============================================================================
// OAUTH TOKEN DTOs - Limit token exposure
// =============================================================================

/**
 * Public-facing token response (DTO)
 * Only exposes token existence, not the actual tokens
 */
export interface TokenResponseDTO {
  hasTokens: boolean;
  expiresIn?: number;
}

/**
 * Transform OAuth tokens to a safe response
 * Only returns whether tokens exist, not the tokens themselves
 */
export function toTokenResponse(tokens: { access_token?: string; refresh_token?: string; expiry_date?: number } | null): TokenResponseDTO {
  if (!tokens || !tokens.access_token) {
    return { hasTokens: false };
  }
  
  let expiresIn: number | undefined;
  if (tokens.expiry_date) {
    expiresIn = Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000));
  }
  
  return {
    hasTokens: true,
    expiresIn
    // EXCLUDED (sensitive):
    // - access_token
    // - refresh_token
  };
}

// =============================================================================
// REGISTRATION DTOs - Filter sensitive payment data
// =============================================================================

import type { Registration } from '../types';

/**
 * Public-facing registration response (DTO)
 * Excludes sensitive payment proof data
 */
export interface RegistrationResponseDTO {
  id: string;
  classId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userSport: string;
  bodyAreas: string[];
  referredBy?: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  registeredAt: string;
  notes?: string;
}

/**
 * Transform registration to safe DTO
 */
export function toRegistrationResponse(registration: Registration): RegistrationResponseDTO {
  return {
    id: registration.id,
    classId: registration.classId,
    userId: registration.userId,
    userName: registration.userName,
    userEmail: registration.userEmail,
    userSport: registration.userSport,
    bodyAreas: registration.bodyAreas || [],
    referredBy: registration.referredBy,
    status: registration.status,
    paymentStatus: registration.paymentStatus,
    paymentMethod: registration.paymentMethod,
    registeredAt: registration.registeredAt,
    notes: registration.notes,
    // EXCLUDED (sensitive):
    // - paymentProof (could contain screenshot of payment)
  };
}

/**
 * Transform registrations to DTOs
 */
export function toRegistrationResponseList(registrations: Registration[]): RegistrationResponseDTO[] {
  return registrations.map(toRegistrationResponse);
}

// =============================================================================
// CLASS DTOs - Minimal data for list views
// =============================================================================

import type { Class } from '../types';

/**
 * Public-facing class response for list views (DTO)
 * Minimal fields needed for displaying class cards
 */
export interface ClassListItemDTO {
  id: string;
  slug: string;
  title: string;
  dateTime: string;
  duration: number;
  venueId: string;
  teacherId?: string;
  sportTags: string[];
  bodyAreaTags: string[];
  capacity: number;
  registered: number;
  status: string;
  price: number;
  creditCost: number;
}

/**
 * Transform class to list item DTO
 */
export function toClassListItem(cls: Class): ClassListItemDTO {
  return {
    id: cls.id,
    slug: cls.slug,
    title: cls.title,
    dateTime: cls.dateTime,
    duration: cls.duration,
    venueId: cls.venueId,
    teacherId: cls.teacherId,
    sportTags: cls.sportTags || [],
    bodyAreaTags: cls.bodyAreaTags || [],
    capacity: cls.capacity,
    registered: cls.registered,
    status: cls.status,
    price: cls.price,
    creditCost: cls.creditCost,
    // EXCLUDED (not needed for list view):
    // - description
    // - allowDomeResetOverride
  };
}

/**
 * Transform classes to list item DTOs
 */
export function toClassListItemList(classes: Class[]): ClassListItemDTO[] {
  return classes.map(toClassListItem);
}
