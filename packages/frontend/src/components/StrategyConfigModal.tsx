/**
 * Strategy Configuration Modal
 * Modal for configuring strategy parameters before launch
 */

import React, { useState, useEffect } from 'react';
import type { StrategyTemplate, StrategyConfig } from '../types/strategy';

interface StrategyConfigModalProps {
    template: StrategyTemplate | null;
    isOpen: boolean;
    onClose: () => void;
    onLaunch: (config: StrategyConfig) => Promise<void>;
}

export function StrategyConfigModal({
    template,
    isOpen,
    onClose,
    onLaunch,
}: StrategyConfigModalProps) {
    const [parameters, setParameters] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize parameters with default values when template changes
    useEffect(() => {
        if (template) {
            const defaultParams: Record<string, any> = {};
            template.parameters.forEach((param) => {
                defaultParams[param.key] = param.defaultValue;
            });
            setParameters(defaultParams);
            setErrors({});
        }
    }, [template]);

    if (!isOpen || !template) return null;

    const validateParameter = (key: string, value: any): string | null => {
        const param = template.parameters.find((p) => p.key === key);
        if (!param) return null;

        // Required validation
        if (param.validation.required && (value === undefined || value === null || value === '')) {
            return `${param.label} is required`;
        }

        // Number validation
        if (param.type === 'number' && value !== undefined && value !== null && value !== '') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                return `${param.label} must be a number`;
            }
            if (param.validation.min !== undefined && numValue < param.validation.min) {
                return `${param.label} must be at least ${param.validation.min}`;
            }
            if (param.validation.max !== undefined && numValue > param.validation.max) {
                return `${param.label} must be at most ${param.validation.max}`;
            }
        }

        // Pattern validation
        if (param.validation.pattern && typeof value === 'string') {
            const regex = new RegExp(param.validation.pattern);
            if (!regex.test(value)) {
                return `${param.label} format is invalid`;
            }
        }

        // Options validation
        if (param.validation.options && param.validation.options.length > 0) {
            if (!param.validation.options.includes(value)) {
                return `${param.label} must be one of: ${param.validation.options.join(', ')}`;
            }
        }

        return null;
    };

    const handleParameterChange = (key: string, value: any) => {
        setParameters((prev) => ({
            ...prev,
            [key]: value,
        }));

        // Validate on change
        const error = validateParameter(key, value);
        setErrors((prev) => ({
            ...prev,
            [key]: error || '',
        }));
    };

    const validateAll = (): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        template.parameters.forEach((param) => {
            const error = validateParameter(param.key, parameters[param.key]);
            if (error) {
                newErrors[param.key] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateAll()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const config: StrategyConfig = {
                name: `${template.name} - ${new Date().toLocaleDateString()}`,
                parameters,
                paperTrading: true,
            };

            await onLaunch(config);
            onClose();
        } catch (error) {
            console.error('Failed to launch strategy:', error);
            alert(`Failed to launch strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {template.name}
                            </h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Configure your strategy parameters
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isSubmitting}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Parameters Form */}
                    <div className="space-y-4 mb-6">
                        {template.parameters.map((param) => (
                            <div key={param.key}>
                                <label className="block text-sm font-medium text-gray-700">
                                    {param.label}
                                    {param.validation.required && (
                                        <span className="text-red-500 ml-1">*</span>
                                    )}
                                    {param.unit && (
                                        <span className="text-gray-500 ml-1">({param.unit})</span>
                                    )}
                                </label>
                                <p className="mt-1 text-xs text-gray-500">
                                    {param.description}
                                </p>

                                {/* Input based on type */}
                                {param.type === 'select' && param.validation.options ? (
                                    <select
                                        value={parameters[param.key] || ''}
                                        onChange={(e) =>
                                            handleParameterChange(param.key, e.target.value)
                                        }
                                        className={`mt-2 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors[param.key]
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                            }`}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select...</option>
                                        {param.validation.options.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : param.type === 'boolean' ? (
                                    <div className="mt-2">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={parameters[param.key] || false}
                                                onChange={(e) =>
                                                    handleParameterChange(param.key, e.target.checked)
                                                }
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                disabled={isSubmitting}
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Enable
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <input
                                        type={param.type === 'number' ? 'number' : 'text'}
                                        value={parameters[param.key] ?? ''}
                                        onChange={(e) =>
                                            handleParameterChange(
                                                param.key,
                                                param.type === 'number'
                                                    ? e.target.value === ''
                                                        ? ''
                                                        : Number(e.target.value)
                                                    : e.target.value
                                            )
                                        }
                                        step={param.type === 'number' ? 'any' : undefined}
                                        className={`mt-2 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors[param.key]
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                            }`}
                                        disabled={isSubmitting}
                                    />
                                )}

                                {/* Error message */}
                                {errors[param.key] && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors[param.key]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Paper Trading Notice */}
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex">
                            <svg
                                className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    Paper Trading Mode
                                </h3>
                                <p className="mt-1 text-sm text-yellow-700">
                                    This strategy will launch in paper trading mode with virtual
                                    funds. No real money will be used.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Launching...' : 'Launch Strategy'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
