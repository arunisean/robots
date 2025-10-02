import { AgentCategory, AgentConfig, ResourceAllocation } from '@multi-agent-platform/shared';
import { IAgent, IAgentFactory } from '../base/IAgent';
import { WorkAgent } from '../work/WorkAgent';
import { ProcessAgent } from '../process/ProcessAgent';
import { PublishAgent } from '../publish/PublishAgent';
import { ValidateAgent } from '../validate/ValidateAgent';
import { AgentRuntimeManager } from '../runtime/AgentRuntimeManager';
import { Logger } from '../../utils/logger';

/**
 * Factory for creating agent instances
 * Implements the Factory pattern for agent creation
 */
export class AgentFactory implements IAgentFactory {
  private logger: Logger;
  private agentTypes: Map<string, AgentConstructor> = new Map();
  private runtimeManager: AgentRuntimeManager;

  constructor(runtimeManager?: AgentRuntimeManager) {
    this.logger = new Logger('AgentFactory');
    this.runtimeManager = runtimeManager || new AgentRuntimeManager();
    this.registerDefaultAgentTypes();
    this.setupEventHandlers();
  }

  /**
   * Create an agent instance of the specified type
   */
  async createAgent(type: string, config: AgentConfig): Promise<IAgent> {
    this.logger.info(`Creating agent of type: ${type}`);

    if (!this.validateAgentType(type)) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const AgentConstructor = this.agentTypes.get(type);
    if (!AgentConstructor) {
      throw new Error(`No constructor found for agent type: ${type}`);
    }

    try {
      // Create agent instance
      const agent = new AgentConstructor(
        config.id,
        config.name,
        config.version || '1.0.0',
        config.description || ''
      );

      // Initialize agent with configuration
      await agent.initialize(config);

      // Register with runtime manager
      await this.runtimeManager.registerAgent(agent);

      this.logger.info(`Successfully created agent: ${config.name} (${type})`);
      return agent;
    } catch (error) {
      this.logger.error(`Failed to create agent ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available agent types
   */
  getAvailableTypes(): string[] {
    return Array.from(this.agentTypes.keys());
  }

  /**
   * Validate if agent type is supported
   */
  validateAgentType(type: string): boolean {
    return this.agentTypes.has(type);
  }

  /**
   * Register a new agent type
   */
  registerAgentType(type: string, constructor: AgentConstructor): void {
    this.logger.info(`Registering agent type: ${type}`);
    this.agentTypes.set(type, constructor);
  }

  /**
   * Unregister an agent type
   */
  unregisterAgentType(type: string): void {
    this.logger.info(`Unregistering agent type: ${type}`);
    this.agentTypes.delete(type);
  }

  /**
   * Create agent based on category and specific type
   */
  async createAgentByCategory(
    category: AgentCategory,
    specificType: string,
    config: AgentConfig
  ): Promise<IAgent> {
    const fullType = `${category}.${specificType}`;
    return await this.createAgent(fullType, config);
  }

  /**
   * Get available types for a specific category
   */
  getTypesByCategory(category: AgentCategory): string[] {
    const categoryPrefix = `${category}.`;
    return this.getAvailableTypes()
      .filter(type => type.startsWith(categoryPrefix))
      .map(type => type.substring(categoryPrefix.length));
  }

  /**
   * Validate agent configuration for specific type
   */
  validateConfigForType(type: string, config: AgentConfig): ValidationResult {
    if (!this.validateAgentType(type)) {
      return {
        success: false,
        errors: [`Unknown agent type: ${type}`]
      };
    }

    // Basic validation
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Agent name is required');
    }

    if (!config.category || !Object.values(AgentCategory).includes(config.category)) {
      errors.push('Valid agent category is required');
    }

    // Type-specific validation would be handled by the agent class itself
    // This is just basic factory-level validation

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Create multiple agents from configurations
   */
  async createAgents(configs: AgentCreationConfig[]): Promise<AgentCreationResult[]> {
    const results: AgentCreationResult[] = [];

    for (const config of configs) {
      try {
        const agent = await this.createAgent(config.type, config.config);
        results.push({
          success: true,
          agent,
          config: config.config
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          config: config.config
        });
      }
    }

    return results;
  }

  /**
   * Start an agent in sandbox environment
   */
  async startAgent(agentId: string, resourceAllocation?: ResourceAllocation): Promise<void> {
    this.logger.info(`Starting agent: ${agentId}`);
    await this.runtimeManager.startAgent(agentId, resourceAllocation);
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<void> {
    this.logger.info(`Stopping agent: ${agentId}`);
    await this.runtimeManager.stopAgent(agentId);
  }

  /**
   * Execute an agent with input data
   */
  async executeAgent(agentId: string, input: any): Promise<any> {
    return await this.runtimeManager.executeAgent(agentId, input);
  }

  /**
   * Get runtime manager instance
   */
  getRuntimeManager(): AgentRuntimeManager {
    return this.runtimeManager;
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats(): any {
    return this.runtimeManager.getRuntimeStats();
  }

  /**
   * Perform health check on all agents
   */
  async performHealthCheck(): Promise<any[]> {
    return await this.runtimeManager.performHealthCheck();
  }

  /**
   * Shutdown factory and runtime manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down agent factory');
    await this.runtimeManager.shutdown();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.runtimeManager.on('agentStarted', (data) => {
      this.logger.info(`Agent started: ${data.agentId}`);
      this.emit('agentStarted', data);
    });

    this.runtimeManager.on('agentStopped', (data) => {
      this.logger.info(`Agent stopped: ${data.agentId}`);
      this.emit('agentStopped', data);
    });

    this.runtimeManager.on('agentError', (data) => {
      this.logger.error(`Agent error: ${data.agentId}`, data.error);
      this.emit('agentError', data);
    });

    this.runtimeManager.on('resourceLimitExceeded', (data) => {
      this.logger.warn(`Resource limit exceeded: ${data.agentId}`, data);
      this.emit('resourceLimitExceeded', data);
    });
  }

  /**
   * Register default agent types
   */
  private registerDefaultAgentTypes(): void {
    // Work Agents
    this.registerAgentType('work.web_scraper', WebScraperAgent);
    this.registerAgentType('work.api_collector', ApiCollectorAgent);
    this.registerAgentType('work.social_media', SocialMediaAgent);

    // Process Agents
    this.registerAgentType('process.text_processor', TextProcessorAgent);
    this.registerAgentType('process.content_generator', ContentGeneratorAgent);
    this.registerAgentType('process.data_transformer', DataTransformerAgent);

    // Publish Agents
    this.registerAgentType('publish.twitter', TwitterPublishAgent);
    this.registerAgentType('publish.linkedin', LinkedInPublishAgent);
    this.registerAgentType('publish.website', WebsitePublishAgent);

    // Validate Agents
    this.registerAgentType('validate.performance_monitor', PerformanceMonitorAgent);
    this.registerAgentType('validate.quality_assessor', QualityAssessorAgent);
    this.registerAgentType('validate.security_scanner', SecurityScannerAgent);
  }
}

/**
 * Agent constructor type
 */
type AgentConstructor = new (
  id: string,
  name: string,
  version: string,
  description: string
) => IAgent;

/**
 * Agent creation configuration
 */
export interface AgentCreationConfig {
  type: string;
  config: AgentConfig;
}

/**
 * Agent creation result
 */
export interface AgentCreationResult {
  success: boolean;
  agent?: IAgent;
  error?: string;
  config: AgentConfig;
}

/**
 * Validation result
 */
interface ValidationResult {
  success: boolean;
  errors?: string[];
}

// Placeholder agent classes - these would be implemented in separate files
class WebScraperAgent extends WorkAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {
    // Implementation
  }
  protected async collectFromTarget(target: any): Promise<any> {
    // Implementation
    return {};
  }
  protected async cleanData(data: any): Promise<any[]> {
    // Implementation
    return [];
  }
  protected async doStartCollection(): Promise<void> {
    // Implementation
  }
  protected async doStopCollection(): Promise<void> {
    // Implementation
  }
  protected async doGetCollectedData(filter?: any): Promise<any[]> {
    // Implementation
    return [];
  }
  protected async testDataSourceConnection(source: any): Promise<void> {
    // Implementation
  }
  protected async doCleanup(): Promise<void> {
    // Implementation
  }
  protected async doHealthCheck(): Promise<boolean> {
    return true;
  }
}

class ApiCollectorAgent extends WorkAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async collectFromTarget(target: any): Promise<any> { return {}; }
  protected async cleanData(data: any): Promise<any[]> { return []; }
  protected async doStartCollection(): Promise<void> {}
  protected async doStopCollection(): Promise<void> {}
  protected async doGetCollectedData(filter?: any): Promise<any[]> { return []; }
  protected async testDataSourceConnection(source: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class SocialMediaAgent extends WorkAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async collectFromTarget(target: any): Promise<any> { return {}; }
  protected async cleanData(data: any): Promise<any[]> { return []; }
  protected async doStartCollection(): Promise<void> {}
  protected async doStopCollection(): Promise<void> {}
  protected async doGetCollectedData(filter?: any): Promise<any[]> { return []; }
  protected async testDataSourceConnection(source: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class TextProcessorAgent extends ProcessAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async processContent(data: any): Promise<any> { return {}; }
  protected async checkQuality(data: any): Promise<any> { return data; }
  protected async doProcessData(data: any): Promise<any> { return {}; }
  protected async doGetProcessingHistory(): Promise<any[]> { return []; }
  protected async testLLMConnection(): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class ContentGeneratorAgent extends ProcessAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async processContent(data: any): Promise<any> { return {}; }
  protected async checkQuality(data: any): Promise<any> { return data; }
  protected async doProcessData(data: any): Promise<any> { return {}; }
  protected async doGetProcessingHistory(): Promise<any[]> { return []; }
  protected async testLLMConnection(): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class DataTransformerAgent extends ProcessAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async processContent(data: any): Promise<any> { return {}; }
  protected async checkQuality(data: any): Promise<any> { return data; }
  protected async doProcessData(data: any): Promise<any> { return {}; }
  protected async doGetProcessingHistory(): Promise<any[]> { return []; }
  protected async testLLMConnection(): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class TwitterPublishAgent extends PublishAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async formatForTarget(content: any): Promise<any> { return content; }
  protected async publishContent(content: any): Promise<any> { return {}; }
  protected async doPublishContent(content: any): Promise<any> { return {}; }
  protected async doGetPublishHistory(): Promise<any[]> { return []; }
  protected async testPublishTargetConnection(target: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class LinkedInPublishAgent extends PublishAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async formatForTarget(content: any): Promise<any> { return content; }
  protected async publishContent(content: any): Promise<any> { return {}; }
  protected async doPublishContent(content: any): Promise<any> { return {}; }
  protected async doGetPublishHistory(): Promise<any[]> { return []; }
  protected async testPublishTargetConnection(target: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class WebsitePublishAgent extends PublishAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async formatForTarget(content: any): Promise<any> { return content; }
  protected async publishContent(content: any): Promise<any> { return {}; }
  protected async doPublishContent(content: any): Promise<any> { return {}; }
  protected async doGetPublishHistory(): Promise<any[]> { return []; }
  protected async testPublishTargetConnection(target: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class PerformanceMonitorAgent extends ValidateAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async collectMetrics(agentId: string): Promise<any> { return {}; }
  protected async analyzePerformance(metrics: any): Promise<any> { return { overallScore: 0.8 }; }
  protected async generateRecommendations(analysis: any): Promise<any[]> { return []; }
  protected async doPerformValidation(): Promise<any> { return {}; }
  protected async doGenerateReport(): Promise<any> { return {}; }
  protected async doGetValidationHistory(): Promise<any[]> { return []; }
  protected async testTargetConnection(target: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class QualityAssessorAgent extends ValidateAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async collectMetrics(agentId: string): Promise<any> { return {}; }
  protected async analyzePerformance(metrics: any): Promise<any> { return { overallScore: 0.8 }; }
  protected async generateRecommendations(analysis: any): Promise<any[]> { return []; }
  protected async doPerformValidation(): Promise<any> { return {}; }
  protected async doGenerateReport(): Promise<any> { return {}; }
  protected async doGetValidationHistory(): Promise<any[]> { return []; }
  protected async testTargetConnection(target: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}

class SecurityScannerAgent extends ValidateAgent {
  protected async doInitialize(config: AgentConfig): Promise<void> {}
  protected async collectMetrics(agentId: string): Promise<any> { return {}; }
  protected async analyzePerformance(metrics: any): Promise<any> { return { overallScore: 0.8 }; }
  protected async generateRecommendations(analysis: any): Promise<any[]> { return []; }
  protected async doPerformValidation(): Promise<any> { return {}; }
  protected async doGenerateReport(): Promise<any> { return {}; }
  protected async doGetValidationHistory(): Promise<any[]> { return []; }
  protected async testTargetConnection(target: any): Promise<void> {}
  protected async doCleanup(): Promise<void> {}
  protected async doHealthCheck(): Promise<boolean> { return true; }
}