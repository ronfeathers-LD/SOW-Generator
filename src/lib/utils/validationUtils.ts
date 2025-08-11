/**
 * Common form validation utilities for SOW forms and other components
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule;
}

/**
 * Validate a single field against its rules
 */
export const validateField = (value: unknown, rules: ValidationRule, fieldName: string): string[] => {
  const errors: string[] = [];
  
  // Required field validation
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
  }
  
  // Skip other validations if value is empty and not required
  if (!value && !rules.required) {
    return errors;
  }
  
  // String length validation
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must be no more than ${rules.maxLength} characters`);
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }
  }
  
  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }
  
  return errors;
};

/**
 * Validate an entire form against validation rules
 */
export const validateForm = (data: Record<string, unknown>, rules: FieldValidation): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;
  
  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const fieldErrors = validateField(data[fieldName], fieldRules, fieldName);
    
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors;
      isValid = false;
    }
  }
  
  return { isValid, errors };
};

/**
 * Common validation rules for SOW forms
 */
export const SOW_VALIDATION_RULES: FieldValidation = {
  client_name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  
  sow_title: {
    required: true,
    minLength: 5,
    maxLength: 200
  },
  
  client_email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  timeline_weeks: {
    required: true,
    custom: (value) => {
      const num = parseInt(String(value));
      if (isNaN(num) || num < 1 || num > 104) {
        return 'Timeline must be between 1 and 104 weeks';
      }
      return null;
    }
  },
  
  project_start_date: {
    required: true,
    custom: (value) => {
      const date = new Date(String(value));
      if (isNaN(date.getTime())) {
        return 'Invalid start date';
      }
      return null;
    }
  },
  
  project_end_date: {
    required: true,
    custom: (value) => {
      const date = new Date(String(value));
      if (isNaN(date.getTime())) {
        return 'Invalid end date';
      }
      return null;
    }
  }
};

/**
 * Validate SOW form data
 */
export const validateSOWForm = (data: Record<string, unknown>): ValidationResult => {
  return validateForm(data, SOW_VALIDATION_RULES);
};

/**
 * Validate date range (start date must be before end date)
 */
export const validateDateRange = (startDate: string, endDate: string): string[] => {
  const errors: string[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) {
    errors.push('Start date must be before end date');
  }
  
  return errors;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

/**
 * Validate phone number format (basic US format)
 */
export const validatePhone = (phone: string): boolean => {
  const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
  return phonePattern.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Validate URL format
 */
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate numeric range
 */
export const validateNumericRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Sanitize input by removing potentially dangerous characters
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: Record<string, string[]>): string[] => {
  const formattedErrors: string[] = [];
  
  for (const [, fieldErrors] of Object.entries(errors)) {
    for (const error of fieldErrors) {
      formattedErrors.push(error);
    }
  }
  
  return formattedErrors;
};
