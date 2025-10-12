import React from 'react';

export interface SelectFieldProps {
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled = false,
  error = false,
  success = false,
  className = '',
}) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors';
  
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : success
    ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white';

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        // Try to convert to number if the original value was a number
        const numVal = Number(val);
        onChange(isNaN(numVal) ? val : numVal);
      }}
      onBlur={onBlur}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
