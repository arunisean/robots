import {
  AgentCategory,
  AgentConfig,
  AgentInput,
  ProcessingType,
  ProcessingRule,
  ProcessedData,
  ProcessAgentConfig,
  ProcessAgentInput,
  ProcessAgentOutput,
  ProcessingSummary,
  LLMConfig
} from '@multi-agent-platform/shared';
import { BaseAgent } from '../base/BaseAgent';
import { IProcessAgent } from './IProcessAgent';

/**
 * Abstract base class for Process Agents (data processing and transformation)
 * Implements common data processing patterns and AI integration
 */
export abstract class ProcessAgent extends BaseAgent implements IProcessAgent {
  protected processingRules: ProcessingRule[] = [];
  protected llmService?: any; // LLM service instance

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, AgentCategory.PROCESS, description);
  }

  /**
   * Set processing rules for the agent
   */
  async setProcessingRules(rules: ProcessingRule[]): Promise<void> {
    this.logger.info(`Setting ${rules.length} processing rules`);
    
    // Validate rules
    for (const rule of rules) {
      if (!this.validateProcessingRule(rule)) {
        throw new Error(`Invalid processing rule: ${rule.name}`);
      }
    }

    this.processingRules = rules.sort((a, b) => a.order - b.order);
    this.emit('rulesSet', { agentId: this.id, rules });
  }

  /**
   * Process data using configured rules
   */
  async processData(data: any): Promise<ProcessedData> {
    this.logger.info('Processing data with configured rules');
    
    try {
      const result = await this.doProcessData(data);
      this.emit('dataProcessed', { agentId: this.id, result });
      return result;
    } catch (error) {
      this.logger.error('Data processing failed:', error);
      throw error;
    }
  }

  /**
   * Get processing history
   */
  async getProcessingHistory(): Promise<any[]> {
    return await this.doGetProcessingHistory();
  }

  /**
   * Core execution logic for Process Agents
   */
  protected async doExecute(input: AgentInput): Promise<ProcessedData[]> {
    const processInput = input as ProcessAgentInput;
    const results: ProcessedData[] = [];

    this.logger.info(`Processing ${processInput.data.length} data items`);

    // Process each data item
    for (const dataItem of processInput.data) {
      try {
        this.logger.debug(`Processing data item: ${dataItem.id || 'unknown'}`);
        
        // Validate input data
        const validatedData = await this.validateInput(dataItem);
        
        // Apply processing rules
        const processedContent = await this.processContent(validatedData);
        
        // Perform quality check
        const qualityCheckedData = await this.checkQuality(processedContent);
        
        results.push(qualityCheckedData);
        
        this.logger.debug(`Successfully processed data item`);
      } catch (error) {
        this.logger.error(`Failed to process data item:`, error);
        // Continue with other items
      }
    }

    return results;
  }

  /**
   * Post-execution processing for Process Agents
   */
  protected async postExecute(result: ProcessedData[], input: AgentInput): Promise<ProcessAgentOutput> {
    const baseOutput = await super.postExecute(result, input);
    
    const summary: ProcessingSummary = {
      totalItems: (input as ProcessAgentInput).data.length,
      processedItems: result.length,
      failedItems: (input as ProcessAgentInput).data.length - result.length,
      averageQualityScore: this.calculateAverageQualityScore(result),
      processingTime: baseOutput.metrics.duration || 0,
      llmUsage: this.getLLMUsageStats(),
      rulesApplied: this.processingRules.filter(rule => rule.enabled).map(rule => rule.name)
    };

    return {
      ...baseOutput,
      data: result,
      summary
    };
  }

  /**
   * Process Agent specific configuration validation
   */
  protected validateSpecificConfig(config: AgentConfig): string[] {
    const errors: string[] = [];
    const processConfig = config as ProcessAgentConfig;

    if (!processConfig.processingRules || processConfig.processingRules.length === 0) {
      errors.push('At least one processing rule must be configured');
    }

    // Validate processing rules
    processConfig.processingRules?.forEach((rule, index) => {
      if (!rule.name || rule.name.trim().length === 0) {
        errors.push(`Processing rule ${index + 1} must have a name`);
      }

      if (!Object.values(ProcessingType).includes(rule.type)) {
        errors.push(`Invalid processing type for rule ${index + 1}`);
      }

      if (typeof rule.order !== 'number' || rule.order < 0) {
        errors.push(`Processing rule ${index + 1} must have a valid order`);
      }
    });

    // Validate LLM configuration if present
    if (processConfig.llmConfig) {
      if (!processConfig.llmConfig.provider || !processConfig.llmConfig.model) {
        errors.push('LLM configuration must include provider and model');
      }
    }

    return errors;
  }

  /**
   * Process Agent specific health check
   */
  protected async doHealthCheck(): Promise<boolean> {
    // Check LLM service if configured
    if (this.llmService) {
      try {
        await this.testLLMConnection();
      } catch (error) {
        this.logger.warn('LLM service is not accessible:', error);
        return false;
      }
    }

    // Check processing rules
    if (this.processingRules.length === 0) {
      this.logger.warn('No processing rules configured');
      return false;
    }

    return true;
  }

  // Abstract methods for subclasses to implement

  /**
   * Process content using agent-specific logic
   */
  protected abstract processContent(data: any): Promise<ProcessedData>;

  /**
   * Perform quality check on processed data
   */
  protected abstract checkQuality(data: ProcessedData): Promise<ProcessedData>;

  /**
   * Process data using configured rules
   */
  protected abstract doProcessData(data: any): Promise<ProcessedData>;

  /**
   * Get processing history
   */
  protected abstract doGetProcessingHistory(): Promise<any[]>;

  /**
   * Test LLM service connection
   */
  protected abstract testLLMConnection(): Promise<void>;

  // Helper methods

  /**
   * Validate processing rule
   */
  private validateProcessingRule(rule: ProcessingRule): boolean {
    if (!rule.name || !rule.type || typeof rule.order !== 'number') {
      return false;
    }

    if (!Object.values(ProcessingType).includes(rule.type)) {
      return false;
    }

    return true;
  }

  /**
   * Validate input data
   */
  private async validateInput(data: any): Promise<any> {
    // Basic validation - can be extended by subclasses
    if (!data) {
      throw new Error('Input data is required');
    }

    return data;
  }

  /**
   * Calculate average quality score
   */
  private calculateAverageQualityScore(results: ProcessedData[]): number {
    if (results.length === 0) return 0;

    const totalScore = results.reduce((sum, result) => {
      return sum + (result.qualityScore?.overall || 0);
    }, 0);

    return totalScore / results.length;
  }

  /**
   * Get LLM usage statistics
   */
  private getLLMUsageStats(): any {
    // This would track actual LLM usage
    // For now, return empty stats
    return {
      provider: this.llmService?.provider || 'none',
      model: this.llmService?.model || 'none',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0
    };
  }
}