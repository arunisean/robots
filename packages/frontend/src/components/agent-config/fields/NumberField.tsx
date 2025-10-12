import React from 'react';

export interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  className?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  min,
  max,
  step = 1,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(0);
      return;
    }
    const numVal = Number(val);
    if (!isNaN(numVal)) {
      onChange(numVal);
    }
  };

  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
    />
  );
};
