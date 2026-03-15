/**
 * Standardized Error Response Format
 * 
 * This module provides consistent error handling across the entire codebase.
 * All API endpoints should use these helper functions to ensure clients
 * receive predictable error responses.
 * 
 * Standard Format: { error: string }
 * - Uses "error" key (not "message") for consistency
 * - Always returns a string message
 */

// HTTP Status Codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Codes for client-side handling
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_NOT_CONFIGURED: 'SERVICE_NOT_CONFIGURED',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: ErrorCode;
  details?: string;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  code?: ErrorCode,
  details?: string
): ErrorResponse {
  const response: ErrorResponse = { error: message };
  if (code) {
    response.code = code;
  }
  if (details) {
    response.details = details;
  }
  return response;
}

/**
 * Create a bad request (400) error response
 */
export function badRequest(message: string, code: ErrorCode = ErrorCodes.VALIDATION_ERROR): ErrorResponse {
  return errorResponse(message, code);
}

/**
 * Create an unauthorized (401) error response
 */
export function unauthorized(message: string = 'Unauthorized'): ErrorResponse {
  return errorResponse(message, ErrorCodes.UNAUTHORIZED);
}

/**
 * Create a forbidden (403) error response
 */
export function forbidden(message: string = 'Forbidden'): ErrorResponse {
  return errorResponse(message, ErrorCodes.FORBIDDEN);
}

/**
 * Create a not found (404) error response
 */
export function notFound(resource: string = 'Resource'): ErrorResponse {
  return errorResponse(`${resource} not found`, ErrorCodes.NOT_FOUND);
}

/**
 * Create a rate limited (429) error response
 */
export function rateLimited(message: string = 'Too many requests'): ErrorResponse {
  return errorResponse(message, ErrorCodes.RATE_LIMIT_EXCEEDED);
}

/**
 * Create an internal server error (500) error response
 */
export function internalError(
  message: string = 'Internal server error',
  code: ErrorCode = ErrorCodes.INTERNAL_ERROR
): ErrorResponse {
  return errorResponse(message, code);
}

/**
 * Create a service not configured error response
 */
export function serviceNotConfigured(service: string): ErrorResponse {
  return errorResponse(
    `${service} not configured. Please set the required environment variables.`,
    ErrorCodes.SERVICE_NOT_CONFIGURED
  );
}

/**
 * Create a missing required field error response
 */
export function missingField(field: string): ErrorResponse {
  return errorResponse(
    `Missing required field: ${field}`,
    ErrorCodes.MISSING_REQUIRED_FIELD
  );
}

/**
 * Create a missing required fields error response
 */
export function missingFields(fields: string[]): ErrorResponse {
  return errorResponse(
    `Missing required fields: ${fields.join(', ')}`,
    ErrorCodes.MISSING_REQUIRED_FIELD
  );
}

/**
 * Express middleware helper for consistent error handling
 * Use this in your Express route handlers
 */
export function handleError(error: unknown, defaultMessage: string = 'An error occurred'): ErrorResponse {
  if (error instanceof Error) {
    return errorResponse(error.message, ErrorCodes.INTERNAL_ERROR, defaultMessage);
  }
  return errorResponse(defaultMessage, ErrorCodes.UNKNOWN_ERROR);
}
