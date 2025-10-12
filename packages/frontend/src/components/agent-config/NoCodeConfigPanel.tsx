import React, { useState, useEffect, useMemo } from 'react';
import { ConfigSchema } from './types';
import { SchemaParser, Validator } from './utils';
import { DynamicFormField } from './DynamicFormField';

export interface NoCodeConfigPanelProps {
  agentTypeId: string;
  agentTypeName: string;
  configSchema: ConfigSchema;
  initialConfig?: Record<string, any>;
  onSave: (config: Record<string, any>) => void;
  onCancel: () => void;
  language?: 'zh' | 'en';
}

export const NoCodeConfigPanel: React.FC<NoCodeConfigPanelProps> = ({
  agentTypeId,
  agentTypeName,
  configSchema,
  initialConfig = {},
  onSave,
  onCancel,
  language = 'en',
}) => {
  // Parse schema into form structure
  const formStructure = useMemo(() => {
    return SchemaParser.parse(configSchema);
  }, [configSchema]);

  // State
  const [config, setConfig] = useState<Record<string, any>>(initialConfig);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize config with default values
  useEffect(() => {
    const configWithDefaults = { ...initialConfig };
    
    for (const field of formStructure.fields) {
      if (field.default !== undefined && Validator.getNestedValue(configWithDefaults, field.path) === undefined) {
        Validator.setNestedValue(configWithDefaults, field.path, field.default);
      }
    }
    
    setConfig(configWithDefaults);
  }, [formStructure.fields, initialConfig]);

  // Handle field change
  const handleFieldChange = (fieldPath: string, value: any) => {
    const newConfig = Validator.setNestedValue(config, fieldPath, value);
    setConfig(newConfig);

    // Clear error for this field
    if (errors[fieldPath]) {
      const newErrors = { ...errors };
      delete newErrors[fieldPath];
      setErrors(newErrors);
    }
  };

  // Handle field blur
  const handleFieldBlur = (fieldPath: string) => {
    setTouched({ ...touched, [fieldPath]: true });

    // Validate field
    const field = formStructure.fields.find((f) => f.path === fieldPath);
    if (field) {
      const value = Validator.getNestedValue(config, fieldPath);
      const error = Validator.validateField(field, value, config);
      if (error) {
        setErrors({ ...errors, [fieldPath]: error });
      }
    }
  };

  // Handle save
  const handleSave = async () => {
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    formStructure.fields.forEach((field) => {
      allTouched[field.path] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const validationResult = Validator.validateConfig(
      configSchema,
      config,
      formStructure.fields
    );

    if (!validationResult.valid) {
      setErrors(validationResult.errors);
      // Scroll to first error
      const firstErrorField = Object.keys(validationResult.errors)[0];
      const element = document.querySelector(`[data-field-path="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Async validation (optional)
    setIsValidating(true);
    try {
      const asyncResult = await Validator.validateConfigAsync(agentTypeId, config);
      if (!asyncResult.valid) {
        setErrors(asyncResult.errors);
        setIsValidating(false);
        return;
      }
    } catch (error) {
      console.error('Async validation error:', error);
      // Continue anyway if async validation fails
    }
    setIsValidating(false);

    // Save
    setIsSaving(true);
    try {
      onSave(config);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onCancel();
  };

  // Handle reset
  const handleReset = () => {
    const defaultConfig: Record<string, any> = {};
    formStructure.fields.forEach((field) => {
      if (field.default !== undefined) {
        Validator.setNestedValue(defaultConfig, field.path, field.default);
      }
    });
    setConfig(defaultConfig);
    setErrors({});
    setTouched({});
  };

  // Check if field should be visible (conditional rendering)
  const isFieldVisible = (fieldPath: string): boolean => {
    const field = formStructure.fields.find((f) => f.path === fieldPath);
    if (!field || !field.ui.conditional) return true;

    const { field: dependentField, value: expectedValue } = field.ui.conditional;
    const actualValue = Validator.getNestedValue(config, dependentField);
    return actualValue === expectedValue;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Agent Configuration
            </h2>
            <p className="text-sm text-gray-500 mt-1">{agentTypeName}</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {formStructure.groups.map((group) => (
            <div key={group.id} className="mb-6">
              {/* Group Header */}
              {group.id !== 'default' && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {group.name}
                </h3>
              )}

              {/* Group Fields */}
              <div className="space-y-4">
                {group.fields
                  .filter((field) => isFieldVisible(field.path))
                  .map((field) => (
                    <div key={field.path} data-field-path={field.path}>
                      <DynamicFormField
                        field={field}
                        value={Validator.getNestedValue(config, field.path)}
                        error={errors[field.path]}
                        touched={touched[field.path] || false}
                        onChange={(value) => handleFieldChange(field.path, value)}
                        onBlur={() => handleFieldBlur(field.path)}
                        language={language}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between rounded-b-lg">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition"
          >
            Reset
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isValidating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving
                ? 'Saving...'
                : isValidating
                ? 'Validating...'
                : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
