import React from 'react';
import { FieldDefinition } from './types';
import {
  InputField,
  TextareaField,
  SelectField,
  CheckboxField,
  NumberField,
} from './fields';

export interface DynamicFormFieldProps {
  field: FieldDefinition;
  value: any;
  error?: string;
  touched: boolean;
  onChange: (value: any) => void;
  onBlur: () => void;
  language?: 'zh' | 'en';
}

export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  error,
  touched,
  onChange,
  onBlur,
  language = 'zh',
}) => {
  const hasError = touched && !!error;
  const hasSuccess = touched && !error && value !== undefined && value !== '';

  // Get field component based on widget type
  const renderField = () => {
    const widget = field.ui.widget || 'input';

    switch (widget) {
      case 'textarea':
        return (
          <TextareaField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={field.ui.placeholder}
            maxLength={field.validation.maxLength}
            error={hasError}
            success={hasSuccess}
          />
        );

      case 'select':
        if (!field.enum || field.enum.length === 0) {
          console.warn(`Field ${field.path} has widget 'select' but no enum values`);
          return null;
        }
        const options = field.enum.map((val) => ({
          value: val,
          label: String(val),
        }));
        return (
          <SelectField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            options={options}
            placeholder={field.ui.placeholder}
            error={hasError}
            success={hasSuccess}
          />
        );

      case 'checkbox':
        return (
          <CheckboxField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            label={field.ui.placeholder}
          />
        );

      case 'number':
      case 'slider':
        return (
          <NumberField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={field.ui.placeholder}
            min={field.validation.minimum}
            max={field.validation.maximum}
            error={hasError}
            success={hasSuccess}
          />
        );

      case 'password':
        return (
          <InputField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={field.ui.placeholder}
            type="password"
            error={hasError}
            success={hasSuccess}
          />
        );

      case 'url':
        return (
          <InputField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={field.ui.placeholder}
            type="url"
            error={hasError}
            success={hasSuccess}
          />
        );

      case 'email':
        return (
          <InputField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={field.ui.placeholder}
            type="email"
            error={hasError}
            success={hasSuccess}
          />
        );

      case 'input':
      default:
        return (
          <InputField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={field.ui.placeholder}
            type="text"
            error={hasError}
            success={hasSuccess}
          />
        );
    }
  };

  return (
    <div className="form-field mb-4">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.title}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Field */}
      {renderField()}

      {/* Help Text */}
      {field.ui.helpText && !hasError && (
        <p className="mt-1 text-sm text-gray-500">{field.ui.helpText}</p>
      )}

      {/* Error Message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
