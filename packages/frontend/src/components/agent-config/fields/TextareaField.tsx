import React from 'react';

export interface TextareaFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  className?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
  maxLength,
  disabled = false,
  error = false,
  success = false,
  className = '',
}) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors resize-vertical';
  
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : success
    ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white';

  return (
    <div className="relative">
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
      />
      {maxLength && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {(value || '').length} / {maxLength}
        </div>
      )}
    </div>
  );
};
