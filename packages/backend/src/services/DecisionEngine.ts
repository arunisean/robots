import { Logger } from '../utils/logger';
import { DecisionConfig, DecisionRule } from '@multi-agent-platform/shared';

/**
 * Decision evaluation result
 */
export interface DecisionResult {
  passed: boolean;
  operator: 'AND' | 'OR';
  ruleResults: RuleEvaluationResult[];
  evaluatedAt: Date;
  executionTime: number; // milliseconds
}

/**
 * Individual rule evaluation result
 */
export interface RuleEvaluationResult {
  rule: DecisionRule;
  passed: boolean;
  actualValue: any;
  expectedValue: any;
  error?: string;
}

/**
 * Decision Engine for conditional workflow execution
 * Evaluates rules against data to determine if execution should proceed
 */
export class DecisionEngine {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DecisionEngine');
  }

  /**
   * Evaluate decision rules against data
   */
  evaluateDecision(config: DecisionConfig, data: any): DecisionResult {
    const startTime = Date.now();

    this.logger.info(`Evaluating decision with ${config.rules.length} rules using ${config.operator} operator`);

    // Evaluate each rule
    const ruleResults: RuleEvaluationResult[] = config.rules.map(rule => 
      this.evaluateRule(rule, data)
    );

    // Apply logical operator
    const passed = config.operator === 'AND'
      ? ruleResults.every(r => r.passed)
      : ruleResults.some(r => r.passed);

    const executionTime = Date.now() - startTime;

    const result: DecisionResult = {
      passed,
      operator: config.operator,
      ruleResults,
      evaluatedAt: new Date(),
      executionTime
    };

    this.logger.info(
      `Decision evaluation ${passed ? 'PASSED' : 'FAILED'}: ` +
      `${ruleResults.filter(r => r.passed).length}/${ruleResults.length} rules passed ` +
      `(${executionTime}ms)`
    );

    return result;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: DecisionRule, data: any): RuleEvaluationResult {
    try {
      // Get the actual value from data using field path
      const actualValue = this.getNestedValue(data, rule.field);

      // Evaluate based on operator
      const passed = this.compareValues(actualValue, rule.operator, rule.value);

      return {
        rule,
        passed,
        actualValue,
        expectedValue: rule.value
      };

    } catch (error) {
      this.logger.error(`Error evaluating rule for field '${rule.field}':`, error);
      
      return {
        rule,
        passed: false,
        actualValue: undefined,
        expectedValue: rule.value,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(
    actualValue: any,
    operator: DecisionRule['operator'],
    expectedValue: any
  ): boolean {
    // Handle undefined/null values
    if (actualValue === undefined || actualValue === null) {
      return operator === 'ne' ? expectedValue !== null : false;
    }

    switch (operator) {
      case 'gt':
        return Number(actualValue) > Number(expectedValue);

      case 'gte':
        return Number(actualValue) >= Number(expectedValue);

      case 'lt':
        return Number(actualValue) < Number(expectedValue);

      case 'lte':
        return Number(actualValue) <= Number(expectedValue);

      case 'eq':
        // Loose equality for numbers, strict for others
        if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
          return Math.abs(actualValue - expectedValue) < Number.EPSILON;
        }
        return actualValue === expectedValue;

      case 'ne':
        // Not equal
        if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
          return Math.abs(actualValue - expectedValue) >= Number.EPSILON;
        }
        return actualValue !== expectedValue;

      case 'between':
        if (!Array.isArray(expectedValue) || expectedValue.length !== 2) {
          throw new Error('Between operator requires array of [min, max]');
        }
        const [min, max] = expectedValue;
        const numValue = Number(actualValue);
        return numValue >= Number(min) && numValue <= Number(max);

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Get nested value from object using dot notation
   * Example: "price.usd" -> data.price.usd
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) {
      return obj;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
        
        current = current[arrayKey];
        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[key];
      }
    }

    return current;
  }

  /**
   * Validate decision configuration
   */
  validateConfig(config: DecisionConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.rules || config.rules.length === 0) {
      errors.push('Decision config must have at least one rule');
    }

    if (!['AND', 'OR'].includes(config.operator)) {
      errors.push(`Invalid operator: ${config.operator}. Must be 'AND' or 'OR'`);
    }

    for (let i = 0; i < config.rules.length; i++) {
      const rule = config.rules[i];

      if (!rule.field) {
        errors.push(`Rule ${i}: field is required`);
      }

      if (!['gt', 'lt', 'eq', 'gte', 'lte', 'between', 'ne'].includes(rule.operator)) {
        errors.push(`Rule ${i}: invalid operator '${rule.operator}'`);
      }

      if (rule.value === undefined || rule.value === null) {
        errors.push(`Rule ${i}: value is required`);
      }

      if (rule.operator === 'between') {
        if (!Array.isArray(rule.value) || rule.value.length !== 2) {
          errors.push(`Rule ${i}: 'between' operator requires array of [min, max]`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a simple decision config for common cases
   */
  static createSimpleDecision(
    field: string,
    operator: DecisionRule['operator'],
    value: any,
    description?: string
  ): DecisionConfig {
    return {
      rules: [{ field, operator, value, description }],
      operator: 'AND',
      description
    };
  }

  /**
   * Create a range check decision (value must be between min and max)
   */
  static createRangeDecision(
    field: string,
    min: number,
    max: number,
    description?: string
  ): DecisionConfig {
    return {
      rules: [{ field, operator: 'between', value: [min, max], description }],
      operator: 'AND',
      description: description || `${field} must be between ${min} and ${max}`
    };
  }

  /**
   * Create a threshold decision (value must exceed threshold)
   */
  static createThresholdDecision(
    field: string,
    threshold: number,
    above: boolean = true,
    description?: string
  ): DecisionConfig {
    return {
      rules: [{
        field,
        operator: above ? 'gt' : 'lt',
        value: threshold,
        description
      }],
      operator: 'AND',
      description: description || `${field} must be ${above ? 'above' : 'below'} ${threshold}`
    };
  }
}
