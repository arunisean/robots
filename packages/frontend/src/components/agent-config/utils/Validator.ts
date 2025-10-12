/**
 * Validator
 * Validates field values and configurations
 */

import {
  FieldDefinition,
  ValidationRules,
  ValidationResult,
  AsyncValidationResult,
  ConfigSchema,
} from '../types';

export class Validator {
  /**
   * Validate a single field value
   */
  static validateField(
    field: FieldDefinition,
    value: any,
    allValues: Record<string, any> = {}
  ): string | null {
    const { validation } = field;

    // Required validation
    if (validation.required && this.isEmpty(value)) {
      return this.getErrorMessage('required', field);
    }

    // Skip other validations if value is empty and not required
    if (this.isEmpty(value)) {
      return null;
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return this.getErrorMessage('pattern', field);
      }
    }

    // String length validation
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return this.getErrorMessage('minLength', field, { min: validation.minLength });
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return this.getErrorMessage('maxLength', field, { max: validation.maxLength });
      }
    }

    // Number range validation
    if (typeof value === 'number') {
      if (validation.minimum !== undefined && value < validation.minimum) {
        return this.getErrorMessage('minimum', field, { min: validation.minimum });
      }
      if (validation.maximum !== undefined && value > validation.maximum) {
        return this.getErrorMessage('maximum', field, { max: validation.maximum });
      }
    }

    // Format validation
    if (validation.format) {
      const formatError = this.validateFormat(value, validation.format);
      if (formatError) {
        return this.getErrorMessage('format', field, { format: validation.format });
      }
    }

    // Custom validation
    if (validation.custom) {
      return validation.custom(value);
    }

    return null;
  }

  /**
   * Validate entire configuration
   */
  static validateConfig(
    schema: ConfigSchema,
    config: Record<string, any>,
    fields: FieldDefinition[]
  ): ValidationResult {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      const value = this.getNestedValue(config, field.path);
      const error = this.validateField(field, value, config);
      if (error) {
        errors[field.path] = error;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Async validation (calls backend API)
   */
  static async validateConfigAsync(
    agentTypeId: string,
    config: Record<string, any>
  ): Promise<AsyncValidationResult> {
    try {
      const response = await fetch(`/api/agent-types/${agentTypeId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        return {
          valid: data.data.valid,
          errors: data.data.errors || {},
          warnings: data.data.warnings || {},
        };
      } else {
        throw new Error(data.error || 'Validation failed');
      }
    } catch (error: any) {
      console.error('Async validation error:', error);
      return {
        valid: false,
        errors: {
          _global: error.message || '验证失败，请检查网络连接',
        },
      };
    }
  }

  /**
   * Check if value is empty
   */
  private static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  /**
   * Validate format
   */
  private static validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'uri':
      case 'url':
        try {
          new URL(value);
          return false; // no error
        } catch {
          return true; // has error
        }

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value);

      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime());

      default:
        return false;
    }
  }

  /**
   * Get error message
   */
  private static getErrorMessage(
    type: string,
    field: FieldDefinition,
    params?: Record<string, any>
  ): string {
    const messages: Record<string, string> = {
      required: 'This field is required',
      pattern: 'Invalid format',
      minLength: `Must be at least ${params?.min} characters`,
      maxLength: `Must be at most ${params?.max} characters`,
      minimum: `Must be at least ${params?.min}`,
      maximum: `Must be at most ${params?.max}`,
      format: this.getFormatErrorMessage(params?.format),
    };

    return messages[type] || 'Validation failed';
  }

  /**
   * Get format-specific error message
   */
  private static getFormatErrorMessage(format?: string): string {
    const messages: Record<string, string> = {
      uri: 'Please enter a valid URL',
      url: 'Please enter a valid URL',
      email: 'Please enter a valid email address',
      date: 'Please enter a valid date',
    };
    return messages[format || ''] || 'Invalid format';
  }

  /**
   * Get nested value from object by path
   */
  static getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Set nested value in object by path
   */
  static setNestedValue(
    obj: Record<string, any>,
    path: string,
    value: any
  ): Record<string, any> {
    const keys = path.split('.');
    const result = { ...obj };
    let current: any = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }
}
