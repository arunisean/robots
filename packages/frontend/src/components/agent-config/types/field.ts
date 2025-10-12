/**
 * Field type definitions
 * These types define the structure of form fields
 */

import { UIConfig, PropertySchema } from './schema';

export interface ValidationRules {
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  format?: 'uri' | 'email' | 'date';
  custom?: (value: any) => string | null;
}

export interface FieldDefinition {
  path: string;                      // Field path (e.g., "schedule.type")
  type: string;                      // Data type
  title: string;                     // Display title
  description?: string;              // Description
  required: boolean;                 // Is required
  default?: any;                     // Default value
  enum?: any[];                      // Enum values for select
  ui: UIConfig;                      // UI configuration
  validation: ValidationRules;       // Validation rules
  schema: PropertySchema;            // Original schema
}

export interface FieldGroup {
  id: string;                        // Group ID
  name: string;                      // Group name
  order: number;                     // Display order
  collapsible: boolean;              // Is collapsible
  defaultExpanded: boolean;          // Default expanded state
  fields: FieldDefinition[];         // Fields in this group
}

export interface FormStructure {
  groups: FieldGroup[];              // Field groups
  fields: FieldDefinition[];         // All fields (flat)
  dependencies: DependencyMap;       // Field dependencies
}

export interface DependencyMap {
  [fieldPath: string]: string[];     // Map of field -> dependent fields
}
