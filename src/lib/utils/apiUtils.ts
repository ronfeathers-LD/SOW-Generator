/**
 * Standardized API response utilities for consistent error handling and response formatting
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create a successful API response
 */
export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString()
});

/**
 * Create an error API response
 */
export const createErrorResponse = (error: string, statusCode: number = 400): ApiResponse & { statusCode: number } => ({
  success: false,
  error,
  timestamp: new Date().toISOString(),
  statusCode
});

/**
 * Create a paginated response
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): PaginatedResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
});

/**
 * Create a not found response
 */
export const createNotFoundResponse = (resource: string = 'Resource'): ApiResponse & { statusCode: number } => ({
  success: false,
  error: `${resource} not found`,
  timestamp: new Date().toISOString(),
  statusCode: 404
});

/**
 * Create an unauthorized response
 */
export const createUnauthorizedResponse = (message: string = 'Unauthorized'): ApiResponse & { statusCode: number } => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
  statusCode: 401
});

/**
 * Create a forbidden response
 */
export const createForbiddenResponse = (message: string = 'Forbidden'): ApiResponse & { statusCode: number } => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
  statusCode: 403
});

/**
 * Create a validation error response
 */
export const createValidationResponse = (errors: Record<string, string[]>): ApiResponse & { statusCode: number } => ({
  success: false,
  error: 'Validation failed',
  data: { errors },
  timestamp: new Date().toISOString(),
  statusCode: 400
});

/**
 * Create a server error response
 */
export const createServerErrorResponse = (message: string = 'Internal server error'): ApiResponse & { statusCode: number } => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
  statusCode: 500
});

/**
 * Helper to handle common database errors
 */
export const handleDatabaseError = (error: unknown): ApiResponse & { statusCode: number } => {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === '23505') { // Unique constraint violation
      return createErrorResponse('Resource already exists', 409);
    }
    
    if (error.code === '23503') { // Foreign key violation
      return createErrorResponse('Referenced resource does not exist', 400);
    }
    
    if (error.code === '42P01') { // Undefined table
      return createServerErrorResponse('Database configuration error');
    }
  }
  
  // Log unexpected database errors
  console.error('Unexpected database error:', error);
  return createServerErrorResponse('Database operation failed');
};

/**
 * Helper to validate required fields
 */
export const validateRequiredFields = (data: Record<string, unknown>, requiredFields: string[]): string[] => {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  }
  
  return missingFields;
};

/**
 * Helper to create validation error response for missing fields
 */
export const createMissingFieldsResponse = (missingFields: string[]): ApiResponse & { statusCode: number } => {
  return createValidationResponse({
    missing: missingFields.map(field => `${field} is required`)
  });
};
