/**
 * Validation type definitions
 */

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'pattern' | 'min' | 'max' | 'format' | 'custom';
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;  // field path -> error message
}

export interface AsyncValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}
