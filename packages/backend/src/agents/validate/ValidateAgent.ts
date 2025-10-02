import {
  AgentCategory,
  AgentConfig,
  AgentInput,
  ValidationType,
  ValidationResult,
  ValidationScore,
  ValidateAgentConfig,
  ValidateAgentInput,
  ValidateAgentOutput,
  ValidationSummary
} from '@multi-agent-platform/shared';
import { BaseAgent } from '../base/BaseAgent';
import { IValidateAgent } from './IValidateAgent';

/**
 * Abstract base class for Validate Agents (validation and quality assurance)
 * Implements common validation patterns and performance monitoring
 */
export abstract class ValidateAgent extends BaseAgent implements IValidateAgent {
  protected validationTarget: any = null;
  protected validationRules: any[] = [];

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, AgentCategory.VALIDATE, description);
  }

  /**
   * Set validation target (agent to validate)
   */
  async setValidationTarget(target: any): Promise<void> {
    this.logger.info(`Setting validation target: ${target.id || target.name}`);
    
    // Validate target
    if (!this.validateTarget(target)) {
      throw new Error(`Invalid validation target`);
    }

    this.validationTarget = target;
    this.emit('targetSet', { agentId: this.id, target });
  }

  /**
   * Perform validation on target
   */
  async performValidation(): Promise<ValidationResult> {
    if (!this.validationTarget) {
      throw new Error('No validation target set');
    }

    this.logger.info('Performing validation on target');
    
    try {
      const result = await this.doPerformValidation();
      this.emit('validationCompleted', { agentId: this.id, result });
      return result;
    } catch (error) {
      this.logger.error('Validation failed:', error);
      throw error;
    }
  }

  /**
   * Generate validation report
   */
  async generateReport(): Promise<any> {
    this.logger.info('Generating validation report');
    
    try {
      const report = await this.doGenerateReport();
      this.emit('reportGenerated', { agentId: this.id, report });
      return report;
    } catch (error) {
      this.logger.error('Report generation failed:', error);
      throw error;
    }
  }

  /**
   * Get validation history
   */
  async getValidationHistory(): Promise<any[]> {
    return await this.doGetValidationHistory();
  }

  /**
   * Core execution logic for Validate Agents
   */
  protected async doExecute(input: AgentInput): Promise<ValidationResult[]> {
    const validateInput = input as ValidateAgentInput;
    const results: ValidationResult[] = [];

    this.logger.info(`Validating ${validateInput.targetAgents.length} agents`);

    // Validate each target agent
    for (const targetAgentId of validateInput.targetAgents) {
      try {
        this.logger.debug(`Validating agent: ${targetAgentId}`);
        
        // Collect metrics from target agent
        const metrics = await this.collectMetrics(targetAgentId);
        
        // Analyze performance
        const analysis = await this.analyzePerformance(metrics);
        
        // Generate recommendations
        const recommendations = await this.generateRecommendations(analysis);
        
        const validationResult: ValidationResult = {
          id: this.generateValidationId(),
          agentId: targetAgentId,
          validatorId: this.id,
          timestamp: new Date(),
          score: analysis.overallScore,
          metrics: metrics,
          analysis: analysis,
          recommendations: recommendations,
          alerts: this.generateAlerts(analysis)
        };
        
        results.push(validationResult);
        
        this.logger.debug(`Successfully validated agent: ${targetAgentId}`);
      } catch (error) {
        this.logger.error(`Failed to validate agent ${targetAgentId}:`, error);
        // Continue with other agents
      }
    }

    return results;
  }

  /**
   * Post-execution processing for Validate Agents
   */
  protected async postExecute(result: ValidationResult[], input: AgentInput): Promise<ValidateAgentOutput> {
    const baseOutput = await super.postExecute(result, input);
    
    const summary: ValidationSummary = {
      totalAgentsValidated: (input as ValidateAgentInput).targetAgents.length,
      averageScore: this.calculateAverageScore(result),
      criticalIssues: this.countCriticalIssues(result),
      recommendations: this.countRecommendations(result),
      trendsIdentified: this.countTrends(result),
      validationTime: baseOutput.metrics.duration || 0,
      nextValidation: this.calculateNextValidation()
    };

    return {
      ...baseOutput,
      data: result,
      summary
    };
  }

  /**
   * Validate Agent specific configuration validation
   */
  protected validateSpecificConfig(config: AgentConfig): string[] {
    const errors: string[] = [];
    const validateConfig = config as ValidateAgentConfig;

    if (!validateConfig.validationRules || validateConfig.validationRules.length === 0) {
      errors.push('At least one validation rule must be configured');
    }

    // Validate validation rules
    validateConfig.validationRules?.forEach((rule, index) => {
      if (!rule.name || rule.name.trim().length === 0) {
        errors.push(`Validation rule ${index + 1} must have a name`);
      }

      if (!Object.values(ValidationType).includes(rule.type)) {
        errors.push(`Invalid validation type for rule ${index + 1}`);
      }

      if (typeof rule.weight !== 'number' || rule.weight < 0 || rule.weight > 1) {
        errors.push(`Validation rule ${index + 1} weight must be between 0 and 1`);
      }
    });

    return errors;
  }

  /**
   * Validate Agent specific health check
   */
  protected async doHealthCheck(): Promise<boolean> {
    // Check if validation rules are configured
    if (this.validationRules.length === 0) {
      this.logger.warn('No validation rules configured');
      return false;
    }

    // Check if validation target is accessible (if set)
    if (this.validationTarget) {
      try {
        await this.testTargetConnection(this.validationTarget);
      } catch (error) {
        this.logger.warn('Validation target is not accessible:', error);
        return false;
      }
    }

    return true;
  }

  // Abstract methods for subclasses to implement

  /**
   * Collect metrics from target agent
   */
  protected abstract collectMetrics(agentId: string): Promise<any>;

  /**
   * Analyze performance based on collected metrics
   */
  protected abstract analyzePerformance(metrics: any): Promise<any>;

  /**
   * Generate recommendations based on analysis
   */
  protected abstract generateRecommendations(analysis: any): Promise<any[]>;

  /**
   * Perform validation using agent-specific logic
   */
  protected abstract doPerformValidation(): Promise<ValidationResult>;

  /**
   * Generate validation report
   */
  protected abstract doGenerateReport(): Promise<any>;

  /**
   * Get validation history
   */
  protected abstract doGetValidationHistory(): Promise<any[]>;

  /**
   * Test connection to validation target
   */
  protected abstract testTargetConnection(target: any): Promise<void>;

  // Helper methods

  /**
   * Validate validation target
   */
  private validateTarget(target: any): boolean {
    if (!target || (!target.id && !target.name)) {
      return false;
    }

    return true;
  }

  /**
   * Generate validation alerts based on analysis
   */
  private generateAlerts(analysis: any): any[] {
    const alerts: any[] = [];

    // Generate alerts based on analysis results
    if (analysis.overallScore < 0.5) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'performance',
        severity: 'critical',
        message: 'Agent performance is below acceptable threshold',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Calculate average validation score
   */
  private calculateAverageScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0;

    const totalScore = results.reduce((sum, result) => {
      return sum + (result.score?.overall || 0);
    }, 0);

    return totalScore / results.length;
  }

  /**
   * Count critical issues
   */
  private countCriticalIssues(results: ValidationResult[]): number {
    return results.reduce((count, result) => {
      return count + (result.alerts?.filter(alert => alert.severity === 'critical').length || 0);
    }, 0);
  }

  /**
   * Count recommendations
   */
  private countRecommendations(results: ValidationResult[]): number {
    return results.reduce((count, result) => {
      return count + (result.recommendations?.length || 0);
    }, 0);
  }

  /**
   * Count identified trends
   */
  private countTrends(results: ValidationResult[]): number {
    // This would analyze trends across validation results
    // For now, return a simple count
    return results.length > 1 ? 1 : 0;
  }

  /**
   * Calculate next validation time
   */
  private calculateNextValidation(): Date {
    // Default to 24 hours from now
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  /**
   * Generate unique validation ID
   */
  private generateValidationId(): string {
    return `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}