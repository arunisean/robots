/**
 * ConfigSchema type definitions
 * These types define the structure of Agent configuration schemas
 */

export type WidgetType = 
  | 'input' 
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'slider' 
  | 'number'
  | 'password'
  | 'url'
  | 'email';

export interface ConditionalConfig {
  field: string;      // Field path to depend on (e.g., "schedule.type")
  value: any;         // Expected value to show this field
}

export interface UIConfig {
  widget?: WidgetType;
  placeholder?: string;
  helpText?: string;
  group?: string;
  order?: number;
  conditional?: ConditionalConfig;
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, PropertySchema>; // for object type
  items?: PropertySchema; // for array type
  ui?: UIConfig;
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
}
