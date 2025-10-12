/**
 * SchemaParser
 * Parses ConfigSchema into FormStructure for rendering
 */

import {
  ConfigSchema,
  PropertySchema,
  FieldDefinition,
  FieldGroup,
  FormStructure,
  DependencyMap,
  ValidationRules,
  UIConfig,
} from '../types';

export class SchemaParser {
  /**
   * Parse ConfigSchema into FormStructure
   */
  static parse(schema: ConfigSchema): FormStructure {
    const fields = this.extractFields(schema);
    const sortedFields = this.sortFields(fields);
    const groups = this.groupFields(sortedFields);
    const dependencies = this.parseDependencies(fields);

    return {
      groups,
      fields: sortedFields,
      dependencies,
    };
  }

  /**
   * Extract all fields from schema
   */
  static extractFields(
    schema: ConfigSchema,
    parentPath: string = '',
    parentRequired: string[] = []
  ): FieldDefinition[] {
    const fields: FieldDefinition[] = [];
    const required = schema.required || [];

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const isRequired = required.includes(key);

      // For object types, recursively extract nested fields
      if (propSchema.type === 'object' && propSchema.properties) {
        const nestedSchema: ConfigSchema = {
          type: 'object',
          properties: propSchema.properties,
          required: propSchema.required,
        };
        const nestedFields = this.extractFields(nestedSchema, path, propSchema.required || []);
        fields.push(...nestedFields);
      } else {
        // Create field definition
        const field: FieldDefinition = {
          path,
          type: propSchema.type,
          title: propSchema.title || this.formatTitle(key),
          description: propSchema.description,
          required: isRequired,
          default: propSchema.default,
          enum: propSchema.enum,
          ui: propSchema.ui || {},
          validation: this.extractValidationRules(propSchema, isRequired),
          schema: propSchema,
        };

        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Extract validation rules from property schema
   */
  private static extractValidationRules(
    schema: PropertySchema,
    required: boolean
  ): ValidationRules {
    return {
      required,
      pattern: schema.pattern,
      minLength: schema.minLength,
      maxLength: schema.maxLength,
      minimum: schema.minimum,
      maximum: schema.maximum,
      format: schema.format as any,
    };
  }

  /**
   * Group fields by their group configuration
   */
  static groupFields(fields: FieldDefinition[]): FieldGroup[] {
    const groupMap = new Map<string, FieldDefinition[]>();

    // Group fields
    for (const field of fields) {
      const groupId = field.ui.group || 'default';
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, []);
      }
      groupMap.get(groupId)!.push(field);
    }

    // Create group objects
    const groups: FieldGroup[] = [];
    for (const [groupId, groupFields] of groupMap.entries()) {
      const group: FieldGroup = {
        id: groupId,
        name: this.formatGroupName(groupId),
        order: this.getGroupOrder(groupId),
        collapsible: groupId !== 'basic',
        defaultExpanded: groupId === 'basic' || groupId === 'default',
        fields: groupFields,
      };
      groups.push(group);
    }

    // Sort groups by order
    return groups.sort((a, b) => a.order - b.order);
  }

  /**
   * Sort fields by their order configuration
   */
  static sortFields(fields: FieldDefinition[]): FieldDefinition[] {
    return [...fields].sort((a, b) => {
      const orderA = a.ui.order ?? 999;
      const orderB = b.ui.order ?? 999;
      return orderA - orderB;
    });
  }

  /**
   * Parse field dependencies for conditional rendering
   */
  static parseDependencies(fields: FieldDefinition[]): DependencyMap {
    const dependencies: DependencyMap = {};

    for (const field of fields) {
      if (field.ui.conditional) {
        const dependentField = field.ui.conditional.field;
        if (!dependencies[dependentField]) {
          dependencies[dependentField] = [];
        }
        dependencies[dependentField].push(field.path);
      }
    }

    return dependencies;
  }

  /**
   * Format field key to title
   */
  private static formatTitle(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format group ID to name
   */
  private static formatGroupName(groupId: string): string {
    const names: Record<string, string> = {
      basic: 'Basic Configuration',
      advanced: 'Advanced Configuration',
      schedule: 'Schedule',
      default: 'Configuration',
    };
    return names[groupId] || this.formatTitle(groupId);
  }

  /**
   * Get group display order
   */
  private static getGroupOrder(groupId: string): number {
    const orders: Record<string, number> = {
      basic: 1,
      default: 2,
      schedule: 100,
      advanced: 200,
    };
    return orders[groupId] ?? 150;
  }
}
