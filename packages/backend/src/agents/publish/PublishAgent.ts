import {
  AgentCategory,
  AgentConfig,
  AgentInput,
  PublishPlatform,
  PublishTarget,
  PublishContent,
  PublishResult,
  PublishAgentConfig,
  PublishAgentInput,
  PublishAgentOutput,
  PublishSummary,
  PublishStatus
} from '@multi-agent-platform/shared';
import { BaseAgent } from '../base/BaseAgent';
import { IPublishAgent } from './IPublishAgent';

/**
 * Abstract base class for Publish Agents (content publishing and distribution)
 * Implements common publishing patterns and multi-platform support
 */
export abstract class PublishAgent extends BaseAgent implements IPublishAgent {
  protected publishTargets: PublishTarget[] = [];
  protected publishQueue: any[] = [];

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, AgentCategory.PUBLISH, description);
  }

  /**
   * Set publish target platform
   */
  async setPublishTarget(target: PublishTarget): Promise<void> {
    this.logger.info(`Setting publish target: ${target.name} (${target.platform})`);
    
    // Validate publish target
    if (!this.validatePublishTarget(target)) {
      throw new Error(`Invalid publish target: ${target.name}`);
    }

    this.publishTargets = [target];
    this.emit('targetSet', { agentId: this.id, target });
  }

  /**
   * Schedule content for publishing
   */
  async schedulePublish(content: PublishContent, schedule: any): Promise<void> {
    this.logger.info(`Scheduling content for publishing: ${content.title || content.id}`);
    
    const queueItem = {
      id: this.generatePublishId(),
      content,
      schedule,
      status: PublishStatus.SCHEDULED,
      createdAt: new Date()
    };

    this.publishQueue.push(queueItem);
    this.emit('contentScheduled', { agentId: this.id, queueItem });
  }

  /**
   * Publish content immediately
   */
  async publishNow(content: PublishContent): Promise<PublishResult> {
    this.logger.info(`Publishing content immediately: ${content.title || content.id}`);
    
    try {
      const result = await this.doPublishContent(content);
      this.emit('contentPublished', { agentId: this.id, result });
      return result;
    } catch (error) {
      this.logger.error('Immediate publishing failed:', error);
      throw error;
    }
  }

  /**
   * Get publishing history
   */
  async getPublishHistory(): Promise<any[]> {
    return await this.doGetPublishHistory();
  }

  /**
   * Core execution logic for Publish Agents
   */
  protected async doExecute(input: AgentInput): Promise<PublishResult[]> {
    const publishInput = input as PublishAgentInput;
    const results: PublishResult[] = [];

    this.logger.info(`Publishing ${publishInput.content.length} content items`);

    // Process each content item
    for (const contentItem of publishInput.content) {
      try {
        this.logger.debug(`Publishing content: ${contentItem.title || contentItem.id}`);
        
        // Format content for target platforms
        const formattedContent = await this.formatForTarget(contentItem);
        
        // Validate content before publishing
        const validatedContent = await this.validateContent(formattedContent);
        
        // Publish content
        const publishResult = await this.publishContent(validatedContent);
        
        results.push(publishResult);
        
        this.logger.debug(`Successfully published content`);
      } catch (error) {
        this.logger.error(`Failed to publish content:`, error);
        
        // Create failed result
        const failedResult: PublishResult = {
          id: this.generatePublishId(),
          targetId: this.publishTargets[0]?.id || 'unknown',
          platform: this.publishTargets[0]?.platform || PublishPlatform.WEBSITE,
          status: PublishStatus.FAILED,
          error: {
            code: 'PUBLISH_ERROR',
            message: error.message,
            retryable: true
          }
        };
        
        results.push(failedResult);
      }
    }

    return results;
  }

  /**
   * Post-execution processing for Publish Agents
   */
  protected async postExecute(result: PublishResult[], input: AgentInput): Promise<PublishAgentOutput> {
    const baseOutput = await super.postExecute(result, input);
    
    const summary: PublishSummary = {
      totalItems: (input as PublishAgentInput).content.length,
      publishedItems: result.filter(r => r.status === PublishStatus.PUBLISHED).length,
      scheduledItems: result.filter(r => r.status === PublishStatus.SCHEDULED).length,
      failedItems: result.filter(r => r.status === PublishStatus.FAILED).length,
      platforms: [...new Set(result.map(r => r.platform))],
      totalReach: this.calculateTotalReach(result),
      totalEngagement: this.calculateTotalEngagement(result),
      processingTime: baseOutput.metrics.duration || 0
    };

    return {
      ...baseOutput,
      data: result,
      summary
    };
  }

  /**
   * Publish Agent specific configuration validation
   */
  protected validateSpecificConfig(config: AgentConfig): string[] {
    const errors: string[] = [];
    const publishConfig = config as PublishAgentConfig;

    if (!publishConfig.targets || publishConfig.targets.length === 0) {
      errors.push('At least one publish target must be configured');
    }

    // Validate each publish target
    publishConfig.targets?.forEach((target, index) => {
      if (!target.platform || !Object.values(PublishPlatform).includes(target.platform)) {
        errors.push(`Invalid platform for target ${index + 1}`);
      }

      if (!target.name || target.name.trim().length === 0) {
        errors.push(`Target ${index + 1} must have a name`);
      }

      if (!target.authentication || !target.authentication.type) {
        errors.push(`Target ${index + 1} must have authentication configuration`);
      }
    });

    return errors;
  }

  /**
   * Publish Agent specific health check
   */
  protected async doHealthCheck(): Promise<boolean> {
    // Check if publish targets are accessible
    for (const target of this.publishTargets) {
      try {
        await this.testPublishTargetConnection(target);
      } catch (error) {
        this.logger.warn(`Publish target ${target.name} is not accessible:`, error);
        return false;
      }
    }

    return true;
  }

  // Abstract methods for subclasses to implement

  /**
   * Format content for target platform
   */
  protected abstract formatForTarget(content: PublishContent): Promise<PublishContent>;

  /**
   * Publish content to target platform
   */
  protected abstract publishContent(content: PublishContent): Promise<PublishResult>;

  /**
   * Publish content using agent-specific logic
   */
  protected abstract doPublishContent(content: PublishContent): Promise<PublishResult>;

  /**
   * Get publishing history
   */
  protected abstract doGetPublishHistory(): Promise<any[]>;

  /**
   * Test publish target connection
   */
  protected abstract testPublishTargetConnection(target: PublishTarget): Promise<void>;

  // Helper methods

  /**
   * Validate publish target configuration
   */
  private validatePublishTarget(target: PublishTarget): boolean {
    if (!target.platform || !target.name || !target.config) {
      return false;
    }

    if (!Object.values(PublishPlatform).includes(target.platform)) {
      return false;
    }

    if (!target.authentication || !target.authentication.type) {
      return false;
    }

    return true;
  }

  /**
   * Validate content before publishing
   */
  private async validateContent(content: PublishContent): Promise<PublishContent> {
    // Basic validation - can be extended by subclasses
    if (!content.content || content.content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    return content;
  }

  /**
   * Generate unique publish ID
   */
  private generatePublishId(): string {
    return `pub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate total reach from publish results
   */
  private calculateTotalReach(results: PublishResult[]): number {
    return results.reduce((total, result) => {
      return total + (result.metrics?.reach || 0);
    }, 0);
  }

  /**
   * Calculate total engagement from publish results
   */
  private calculateTotalEngagement(results: PublishResult[]): number {
    return results.reduce((total, result) => {
      return total + (result.metrics?.engagement || 0);
    }, 0);
  }
}