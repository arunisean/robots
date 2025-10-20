import { EventEmitter } from 'events';
import {
  StrategyTemplate,
  UserStrategyInstance,
  Workflow,
  InstantiateStrategyDto,
  CreateWorkflowDto,
  WorkflowDefinition,
  TradingWorkflowDefinition,
  TemplateParameter
} from '@multi-agent-platform/shared';
import { StrategyTemplateRepository, UserStrategyInstanceRepository, WorkflowRepository } from '../database/repositories';
import { Logger } from '../utils/logger';

/**
 * Service for instantiating strategy templates into user workflows
 * Handles parameter validation, substitution, and workflow generation
 */
export class StrategyInstantiationService extends EventEmitter {
  private templateRepo: StrategyTemplateRepository;
  private instanceRepo: UserStrategyInstanceRepository;
  private workflowRepo: WorkflowRepository;
  private logger: Logger;

  constructor(
    templateRepo: StrategyTemplateRepository,
    instanceRepo: UserStrategyInstanceRepository,
    workflowRepo: WorkflowRepository
  ) {
    super();
    this.templateRepo = templateRepo;
    this.instanceRepo = instanceRepo;
    this.workflowRepo = workflowRepo;
    this.logger = new Logger('StrategyInstantiationService');
  }

  /**
   * Instantiate a strategy template for a user
   */
  async instantiateStrategy(
    data: InstantiateStrategyDto,
    userId: string
  ): Promise<{
    instance: UserStrategyInstance;
    workflow: Workflow;
  }> {
    this.logger.info(`Instantiating strategy ${data.templateId} for user ${userId}`);

    try {
      // 1. Get template
      const template = await this.templateRepo.findById(data.templateId);
      if (!template) {
        throw new Error(`Template ${data.templateId} not found`);
      }

      if (!template.published) {
        throw new Error(`Template ${data.templateId} is not published`);
      }

      // 2. Validate user parameters
      this.validateParameters(template.parameters, data.parameters);

      // 3. Generate workflow from template
      const workflow = await this.generateWorkflow(template, data.parameters, userId, data.name);

      // 4. Create strategy instance
      const instance = await this.instanceRepo.create(
        userId,
        data.templateId,
        workflow.id,
        data.name,
        data.parameters,
        data.paperTrading ?? true
      );

      // 5. Increment template usage count
      await this.templateRepo.incrementUsageCount(data.templateId);

      this.emit('strategyInstantiated', { instance, workflow, userId, templateId: data.templateId });
      this.logger.info(`Strategy instantiated: ${instance.id}`);

      return { instance, workflow };
    } catch (error) {
      this.logger.error('Failed to instantiate strategy:', error);
      throw error;
    }
  }

  /**
   * Validate user parameters against template parameter definitions
   */
  validateParameters(
    templateParams: TemplateParameter[],
    userParams: Record<string, any>
  ): void {
    const errors: string[] = [];

    for (const param of templateParams) {
      const value = userParams[param.key];

      // Check required
      if (param.validation.required && (value === undefined || value === null || value === '')) {
        errors.push(`Parameter '${param.label}' is required`);
        continue;
      }

      // Skip validation if not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      switch (param.type) {
        case 'number':
        case 'percentage':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`Parameter '${param.label}' must be a number`);
          } else {
            // Min/max validation
            if (param.validation.min !== undefined && value < param.validation.min) {
              errors.push(`Parameter '${param.label}' must be >= ${param.validation.min}`);
            }
            if (param.validation.max !== undefined && value > param.validation.max) {
              errors.push(`Parameter '${param.label}' must be <= ${param.validation.max}`);
            }
          }
          break;

        case 'string':
        case 'token_pair':
        case 'address':
          if (typeof value !== 'string') {
            errors.push(`Parameter '${param.label}' must be a string`);
          } else {
            // Pattern validation
            if (param.validation.pattern) {
              const regex = new RegExp(param.validation.pattern);
              if (!regex.test(value)) {
                errors.push(`Parameter '${param.label}' does not match required pattern`);
              }
            }
            // Options validation
            if (param.validation.options && !param.validation.options.includes(value)) {
              errors.push(`Parameter '${param.label}' must be one of: ${param.validation.options.join(', ')}`);
            }
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Parameter '${param.label}' must be a boolean`);
          }
          break;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Parameter validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Generate workflow from template with parameter substitution
   */
  private async generateWorkflow(
    template: StrategyTemplate,
    userParams: Record<string, any>,
    userId: string,
    instanceName: string
  ): Promise<Workflow> {
    this.logger.debug(`Generating workflow for template ${template.id}`);

    try {
      // Substitute parameters in workflow definition
      const workflowDefinition = this.substituteParameters(
        template.workflowDefinition,
        userParams
      );

      // Convert TradingWorkflowDefinition to WorkflowDefinition
      const standardWorkflowDef = this.convertToStandardWorkflow(workflowDefinition);

      // Create workflow DTO
      const createWorkflowDto: CreateWorkflowDto = {
        name: instanceName,
        description: `Strategy instance of ${template.name}`,
        version: template.version,
        definition: standardWorkflowDef,
        settings: {
          maxConcurrentExecutions: 1,
          executionTimeout: workflowDefinition.settings.riskControls.cooldownPeriod || 3600,
          retryPolicy: {
            enabled: true,
            maxRetries: 3,
            backoffStrategy: 'exponential',
            backoffMs: 1000
          },
          errorHandling: {
            strategy: 'stop',
            notifyOnError: workflowDefinition.settings.notifications.enabled
          },
          logging: workflowDefinition.settings.logging
        },
        metadata: {
          tags: template.tags,
          category: template.category,
          templateId: template.id,
          strategyType: 'trading',
          riskProfile: template.riskProfile,
          paperTrading: workflowDefinition.settings.paperTrading
        }
      };

      // Create workflow
      const workflow = await this.workflowRepo.create(createWorkflowDto, userId);

      this.logger.debug(`Workflow generated: ${workflow.id}`);
      return workflow;
    } catch (error) {
      this.logger.error('Failed to generate workflow:', error);
      throw error;
    }
  }

  /**
   * Substitute user parameters in workflow definition
   */
  private substituteParameters(
    workflowDef: TradingWorkflowDefinition,
    userParams: Record<string, any>
  ): TradingWorkflowDefinition {
    // Deep clone to avoid modifying original
    const cloned = JSON.parse(JSON.stringify(workflowDef));

    // Recursively replace parameter placeholders
    const substitute = (obj: any): any => {
      if (typeof obj === 'string') {
        // Replace {{paramName}} with actual value
        return obj.replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
          if (userParams[paramName] !== undefined) {
            return String(userParams[paramName]);
          }
          return match; // Keep placeholder if param not found
        });
      } else if (Array.isArray(obj)) {
        return obj.map(item => substitute(item));
      } else if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = substitute(obj[key]);
        }
        return result;
      }
      return obj;
    };

    return substitute(cloned);
  }

  /**
   * Convert TradingWorkflowDefinition to standard WorkflowDefinition
   */
  private convertToStandardWorkflow(
    tradingDef: TradingWorkflowDefinition
  ): WorkflowDefinition {
    const nodes: any[] = [];
    const connections: any[] = [];
    let nodeIndex = 0;

    // Helper to create node ID
    const createNodeId = (stage: string, index: number) => `${stage}_${index}`;

    // Add Monitor agents
    if (tradingDef.stages.monitor.agents) {
      tradingDef.stages.monitor.agents.forEach((agent, idx) => {
        const nodeId = createNodeId('monitor', idx);
        nodes.push({
          id: nodeId,
          agentType: agent.type || 'monitor',
          agentCategory: 'monitor',
          config: agent,
          order: nodeIndex++
        });
      });
    }

    // Add Analyze agents
    if (tradingDef.stages.analyze.agents) {
      tradingDef.stages.analyze.agents.forEach((agent, idx) => {
        const nodeId = createNodeId('analyze', idx);
        nodes.push({
          id: nodeId,
          agentType: agent.type || 'analyze',
          agentCategory: 'analyze',
          config: agent,
          order: nodeIndex++
        });

        // Connect to all monitor agents
        const monitorNodes = nodes.filter(n => n.agentCategory === 'monitor');
        monitorNodes.forEach(monitorNode => {
          connections.push({
            from: monitorNode.id,
            to: nodeId
          });
        });
      });
    }

    // Add Execute agents
    if (tradingDef.stages.execute.agents) {
      tradingDef.stages.execute.agents.forEach((agent, idx) => {
        const nodeId = createNodeId('execute', idx);
        nodes.push({
          id: nodeId,
          agentType: agent.type || 'execute',
          agentCategory: 'execute',
          config: agent,
          order: nodeIndex++
        });

        // Connect to all analyze agents
        const analyzeNodes = nodes.filter(n => n.agentCategory === 'analyze');
        analyzeNodes.forEach(analyzeNode => {
          connections.push({
            from: analyzeNode.id,
            to: nodeId,
            condition: tradingDef.stages.decision ? JSON.stringify(tradingDef.stages.decision) : undefined
          });
        });
      });
    }

    // Add Verify agent
    if (tradingDef.stages.verify.agent) {
      const nodeId = createNodeId('verify', 0);
      nodes.push({
        id: nodeId,
        agentType: tradingDef.stages.verify.agent.type || 'verify',
        agentCategory: 'verify',
        config: tradingDef.stages.verify.agent,
        order: nodeIndex++
      });

      // Connect to all execute agents
      const executeNodes = nodes.filter(n => n.agentCategory === 'execute');
      executeNodes.forEach(executeNode => {
        connections.push({
          from: executeNode.id,
          to: nodeId
        });
      });
    }

    return {
      nodes,
      connections
    };
  }

  /**
   * Update strategy instance parameters
   */
  async updateInstanceParameters(
    instanceId: string,
    userId: string,
    newParameters: Record<string, any>
  ): Promise<UserStrategyInstance> {
    this.logger.info(`Updating parameters for instance ${instanceId}`);

    try {
      // Get instance
      const instance = await this.instanceRepo.findById(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      // Check ownership
      if (instance.userId !== userId) {
        throw new Error('Access denied: You do not own this strategy instance');
      }

      // Get template
      const template = await this.templateRepo.findById(instance.templateId);
      if (!template) {
        throw new Error(`Template ${instance.templateId} not found`);
      }

      // Validate new parameters
      this.validateParameters(template.parameters, newParameters);

      // Update instance
      const updated = await this.instanceRepo.update(instanceId, {
        parameters: newParameters
      });

      this.emit('instanceParametersUpdated', { instance: updated, userId });
      this.logger.info(`Instance parameters updated: ${instanceId}`);

      return updated;
    } catch (error) {
      this.logger.error(`Failed to update instance parameters ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Get default parameters for a template
   */
  async getDefaultParameters(templateId: string): Promise<Record<string, any>> {
    try {
      const template = await this.templateRepo.findById(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      const defaults: Record<string, any> = {};
      for (const param of template.parameters) {
        defaults[param.key] = param.defaultValue;
      }

      return defaults;
    } catch (error) {
      this.logger.error(`Failed to get default parameters for template ${templateId}:`, error);
      throw error;
    }
  }
}
