import {
  CreateStrategyTemplateDto,
  TemplateParameter,
  TradingWorkflowDefinition,
  StrategyRiskProfile as RiskProfile
} from '@multi-agent-platform/shared';
import { Logger } from '../utils/logger';

/**
 * Validation result
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: string[];
}

export interface TemplateValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Service for validating strategy templates
 * Ensures template completeness and correctness
 */
export class StrategyTemplateValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('StrategyTemplateValidator');
  }

  /**
   * Validate complete template
   */
  validate(template: CreateStrategyTemplateDto): TemplateValidationResult {
    const errors: TemplateValidationError[] = [];
    const warnings: string[] = [];

    // Validate basic fields
    this.validateBasicFields(template, errors);

    // Validate parameters
    this.validateParameters(template.parameters, errors, warnings);

    // Validate workflow definition
    this.validateWorkflowDefinition(template.workflowDefinition, errors, warnings);

    // Validate risk profile
    this.validateRiskProfile(template.riskProfile, errors);

    // Validate performance metrics if provided
    if (template.performanceMetrics) {
      this.validatePerformanceMetrics(template.performanceMetrics, warnings);
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate basic template fields
   */
  private validateBasicFields(
    template: CreateStrategyTemplateDto,
    errors: TemplateValidationError[]
  ): void {
    if (!template.name || template.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Template name is required',
        severity: 'error'
      });
    }

    if (template.name && template.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Template name must be 255 characters or less',
        severity: 'error'
      });
    }

    if (!template.description || template.description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Template description is required',
        severity: 'error'
      });
    }

    if (!template.category) {
      errors.push({
        field: 'category',
        message: 'Template category is required',
        severity: 'error'
      });
    }

    if (!template.difficulty) {
      errors.push({
        field: 'difficulty',
        message: 'Template difficulty is required',
        severity: 'error'
      });
    }
  }

  /**
   * Validate template parameters
   */
  private validateParameters(
    parameters: TemplateParameter[],
    errors: TemplateValidationError[],
    warnings: string[]
  ): void {
    if (!parameters || !Array.isArray(parameters)) {
      errors.push({
        field: 'parameters',
        message: 'Parameters must be an array',
        severity: 'error'
      });
      return;
    }

    if (parameters.length === 0) {
      warnings.push('Template has no configurable parameters');
    }

    const paramKeys = new Set<string>();

    parameters.forEach((param, index) => {
      const prefix = `parameters[${index}]`;

      // Check required fields
      if (!param.key) {
        errors.push({
          field: `${prefix}.key`,
          message: 'Parameter key is required',
          severity: 'error'
        });
      } else {
        // Check for duplicate keys
        if (paramKeys.has(param.key)) {
          errors.push({
            field: `${prefix}.key`,
            message: `Duplicate parameter key: ${param.key}`,
            severity: 'error'
          });
        }
        paramKeys.add(param.key);

        // Validate key format (alphanumeric and underscore only)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param.key)) {
          errors.push({
            field: `${prefix}.key`,
            message: 'Parameter key must start with letter or underscore and contain only alphanumeric characters and underscores',
            severity: 'error'
          });
        }
      }

      if (!param.label) {
        errors.push({
          field: `${prefix}.label`,
          message: 'Parameter label is required',
          severity: 'error'
        });
      }

      if (!param.type) {
        errors.push({
          field: `${prefix}.type`,
          message: 'Parameter type is required',
          severity: 'error'
        });
      }

      if (!param.validation) {
        errors.push({
          field: `${prefix}.validation`,
          message: 'Parameter validation rules are required',
          severity: 'error'
        });
      } else {
        // Validate validation rules
        if (param.type === 'number' || param.type === 'percentage') {
          if (param.validation.min !== undefined && param.validation.max !== undefined) {
            if (param.validation.min > param.validation.max) {
              errors.push({
                field: `${prefix}.validation`,
                message: 'Min value cannot be greater than max value',
                severity: 'error'
              });
            }
          }
        }

        if (param.validation.options && !Array.isArray(param.validation.options)) {
          errors.push({
            field: `${prefix}.validation.options`,
            message: 'Validation options must be an array',
            severity: 'error'
          });
        }
      }

      // Validate default value
      if (param.defaultValue === undefined || param.defaultValue === null) {
        if (param.validation?.required) {
          errors.push({
            field: `${prefix}.defaultValue`,
            message: 'Required parameter must have a default value',
            severity: 'error'
          });
        }
      } else {
        // Type check default value
        this.validateParameterValue(param, param.defaultValue, `${prefix}.defaultValue`, errors);
      }
    });
  }

  /**
   * Validate parameter value against its definition
   */
  private validateParameterValue(
    param: TemplateParameter,
    value: any,
    fieldPath: string,
    errors: TemplateValidationError[]
  ): void {
    switch (param.type) {
      case 'number':
      case 'percentage':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: fieldPath,
            message: `Value must be a number`,
            severity: 'error'
          });
        } else {
          if (param.validation.min !== undefined && value < param.validation.min) {
            errors.push({
              field: fieldPath,
              message: `Value must be >= ${param.validation.min}`,
              severity: 'error'
            });
          }
          if (param.validation.max !== undefined && value > param.validation.max) {
            errors.push({
              field: fieldPath,
              message: `Value must be <= ${param.validation.max}`,
              severity: 'error'
            });
          }
        }
        break;

      case 'string':
      case 'token_pair':
      case 'address':
        if (typeof value !== 'string') {
          errors.push({
            field: fieldPath,
            message: `Value must be a string`,
            severity: 'error'
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: fieldPath,
            message: `Value must be a boolean`,
            severity: 'error'
          });
        }
        break;
    }
  }

  /**
   * Validate workflow definition
   */
  private validateWorkflowDefinition(
    workflowDef: TradingWorkflowDefinition,
    errors: TemplateValidationError[],
    warnings: string[]
  ): void {
    if (!workflowDef) {
      errors.push({
        field: 'workflowDefinition',
        message: 'Workflow definition is required',
        severity: 'error'
      });
      return;
    }

    // Validate trigger
    if (!workflowDef.trigger) {
      errors.push({
        field: 'workflowDefinition.trigger',
        message: 'Workflow trigger is required',
        severity: 'error'
      });
    } else {
      if (!workflowDef.trigger.type) {
        errors.push({
          field: 'workflowDefinition.trigger.type',
          message: 'Trigger type is required',
          severity: 'error'
        });
      }
    }

    // Validate stages
    if (!workflowDef.stages) {
      errors.push({
        field: 'workflowDefinition.stages',
        message: 'Workflow stages are required',
        severity: 'error'
      });
      return;
    }

    const stages = workflowDef.stages;

    // Validate Monitor stage
    if (!stages.monitor) {
      errors.push({
        field: 'workflowDefinition.stages.monitor',
        message: 'Monitor stage is required',
        severity: 'error'
      });
    } else {
      if (!stages.monitor.agents || stages.monitor.agents.length === 0) {
        errors.push({
          field: 'workflowDefinition.stages.monitor.agents',
          message: 'Monitor stage must have at least one agent',
          severity: 'error'
        });
      }
    }

    // Validate Analyze stage
    if (!stages.analyze) {
      errors.push({
        field: 'workflowDefinition.stages.analyze',
        message: 'Analyze stage is required',
        severity: 'error'
      });
    } else {
      if (!stages.analyze.agents || stages.analyze.agents.length === 0) {
        errors.push({
          field: 'workflowDefinition.stages.analyze.agents',
          message: 'Analyze stage must have at least one agent',
          severity: 'error'
        });
      }
    }

    // Validate Execute stage
    if (!stages.execute) {
      errors.push({
        field: 'workflowDefinition.stages.execute',
        message: 'Execute stage is required',
        severity: 'error'
      });
    } else {
      if (!stages.execute.agents || stages.execute.agents.length === 0) {
        errors.push({
          field: 'workflowDefinition.stages.execute.agents',
          message: 'Execute stage must have at least one agent',
          severity: 'error'
        });
      }
      if (stages.execute.executionMode !== 'sequential') {
        warnings.push('Execute stage should use sequential execution mode for trading safety');
      }
    }

    // Validate Verify stage
    if (!stages.verify) {
      errors.push({
        field: 'workflowDefinition.stages.verify',
        message: 'Verify stage is required',
        severity: 'error'
      });
    } else {
      if (!stages.verify.agent) {
        errors.push({
          field: 'workflowDefinition.stages.verify.agent',
          message: 'Verify stage must have an agent',
          severity: 'error'
        });
      }
    }

    // Validate decision rules if present
    if (stages.decision) {
      if (!stages.decision.rules || stages.decision.rules.length === 0) {
        warnings.push('Decision stage has no rules defined');
      }
    }

    // Validate settings
    if (!workflowDef.settings) {
      errors.push({
        field: 'workflowDefinition.settings',
        message: 'Workflow settings are required',
        severity: 'error'
      });
    } else {
      if (!workflowDef.settings.riskControls) {
        errors.push({
          field: 'workflowDefinition.settings.riskControls',
          message: 'Risk controls are required',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate risk profile
   */
  private validateRiskProfile(
    riskProfile: RiskProfile,
    errors: TemplateValidationError[]
  ): void {
    if (!riskProfile) {
      errors.push({
        field: 'riskProfile',
        message: 'Risk profile is required',
        severity: 'error'
      });
      return;
    }

    if (!riskProfile.level) {
      errors.push({
        field: 'riskProfile.level',
        message: 'Risk level is required',
        severity: 'error'
      });
    }

    if (riskProfile.maxLossPerTrade === undefined) {
      errors.push({
        field: 'riskProfile.maxLossPerTrade',
        message: 'Max loss per trade is required',
        severity: 'error'
      });
    } else if (riskProfile.maxLossPerTrade < 0 || riskProfile.maxLossPerTrade > 100) {
      errors.push({
        field: 'riskProfile.maxLossPerTrade',
        message: 'Max loss per trade must be between 0 and 100',
        severity: 'error'
      });
    }

    if (riskProfile.maxDailyLoss === undefined) {
      errors.push({
        field: 'riskProfile.maxDailyLoss',
        message: 'Max daily loss is required',
        severity: 'error'
      });
    } else if (riskProfile.maxDailyLoss < 0 || riskProfile.maxDailyLoss > 100) {
      errors.push({
        field: 'riskProfile.maxDailyLoss',
        message: 'Max daily loss must be between 0 and 100',
        severity: 'error'
      });
    }

    if (riskProfile.maxPositionSize === undefined) {
      errors.push({
        field: 'riskProfile.maxPositionSize',
        message: 'Max position size is required',
        severity: 'error'
      });
    } else if (riskProfile.maxPositionSize < 0 || riskProfile.maxPositionSize > 100) {
      errors.push({
        field: 'riskProfile.maxPositionSize',
        message: 'Max position size must be between 0 and 100',
        severity: 'error'
      });
    }

    if (riskProfile.requiredCapital === undefined) {
      errors.push({
        field: 'riskProfile.requiredCapital',
        message: 'Required capital is required',
        severity: 'error'
      });
    } else if (riskProfile.requiredCapital < 0) {
      errors.push({
        field: 'riskProfile.requiredCapital',
        message: 'Required capital must be >= 0',
        severity: 'error'
      });
    }
  }

  /**
   * Validate performance metrics
   */
  private validatePerformanceMetrics(
    metrics: any,
    warnings: string[]
  ): void {
    if (!metrics.backtestPeriod) {
      warnings.push('Performance metrics missing backtest period');
    }

    if (metrics.winRate !== undefined && (metrics.winRate < 0 || metrics.winRate > 100)) {
      warnings.push('Win rate should be between 0 and 100');
    }

    if (metrics.maxDrawdown !== undefined && (metrics.maxDrawdown < 0 || metrics.maxDrawdown > 100)) {
      warnings.push('Max drawdown should be between 0 and 100');
    }

    if (metrics.totalTrades !== undefined && metrics.totalTrades < 0) {
      warnings.push('Total trades should be >= 0');
    }
  }
}
