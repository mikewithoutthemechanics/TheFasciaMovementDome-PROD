/**
 * Custom hooks for the FASCIA Dome application
 * 
 * This module exports all custom hooks for easy importing:
 * - useAuth: Authentication state and handlers
 * - useData: Data loading and CRUD operations
 * - useInactivity: User inactivity timeout management
 */

export { useAuth, INACTIVITY_TIMEOUT, syncUserToServer } from './useAuth';
export type { UseAuthReturn } from './useAuth';

export { useInactivity } from './useInactivity';
export type { UseInactivityOptions, UseInactivityReturn } from './useInactivity';

export { useData, DEFAULT_SETTINGS } from './useData';
export type {
  UseDataState,
  UseDataRegistrationHandlers,
  UseDataClassHandlers,
  UseDataVenueHandlers,
  UseDataTemplateHandlers,
  UseDataDisclaimerHandlers,
  UseDataSettingsHandlers,
  UseDataUserHandlers,
  UseDataTeacherHandlers,
  UseDataReturn
} from './useData';
