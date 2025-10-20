import { EventEmitter } from 'events';
import {
  StrategyTemplate,
  CreateStrategyTemplateDto,
  UpdateStrategyTemplateDto,
  StrategyTemplateFilters,
  StrategyCategory,
  StrategyDifficulty
} from '@multi-agent-platform/shared';
import { StrategyTemplateRepository } from '../database/repositories';
import { Logger } from '../utils/logger';

/**
 * Registry service for strategy templates
 * Manages template registration, retrieval, and validation
 */
export class StrategyTemplateRegistry extends EventEmitter {
  private templateRepo: StrategyTemplateRepository;
  private logger: Logger;
  private templateCache: Map<string, StrategyTemplate>;

  constructor(templateRepo: StrategyTemplateRepository) {
    super();
    this.templateRepo = templateRepo;
    this.logger = new Logger('StrategyTemplateRegistry');
    this.templateCache = new Map();
  }

  /**
   * Initialize registry - load templates from database
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing strategy template registry');

    try {
      // Load all published templates into cache
      const templates = await this.templateRepo.findAll({ published: true });
      
      for (const template of templates) {
        this.templateCache.set(template.id, template);
      }

      this.logger.info(`Loaded ${templates.length} templates into cache`);
    } catch (error) {
      this.logger.error('Failed to initialize template registry:', error);
      throw error;
    }
  }

  /**
   * Register a new template
   */
  async registerTemplate(
    data: CreateStrategyTemplateDto,
    authorId?: string
  ): Promise<StrategyTemplate> {
    this.logger.info(`Registering template: ${data.name}`);

    try {
      // Validate template structure
      this.validateTemplateStructure(data);

      // Create template in database
      const template = await this.templateRepo.create(data, authorId);

      // Add to cache if published
      if (template.published) {
        this.templateCache.set(template.id, template);
      }

      this.emit('templateRegistered', { template, authorId });
      this.logger.info(`Template registered: ${template.id}`);

      return template;
    } catch (error) {
      this.logger.error('Failed to register template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<StrategyTemplate | null> {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    // Fetch from database
    try {
      const template = await this.templateRepo.findById(templateId);
      
      if (template && template.published) {
        this.templateCache.set(templateId, template);
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to get template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * List templates with filters
   */
  async listTemplates(filters?: StrategyTemplateFilters): Promise<StrategyTemplate[]> {
    try {
      // If no filters and requesting published templates, use cache
      if (!filters || (filters.published === true && Object.keys(filters).length === 1)) {
        return Array.from(this.templateCache.values());
      }

      // Otherwise query database
      return await this.templateRepo.findAll(filters);
    } catch (error) {
      this.logger.error('Failed to list templates:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    data: UpdateStrategyTemplateDto
  ): Promise<StrategyTemplate> {
    this.logger.info(`Updating template: ${templateId}`);

    try {
      // Validate if structure is being updated
      if (data.parameters || data.workflowDefinition || data.riskProfile) {
        this.validateTemplateStructure(data as any);
      }

      const template = await this.templateRepo.update(templateId, data);

      // Update cache
      if (template.published) {
        this.templateCache.set(templateId, template);
      } else {
        this.templateCache.delete(templateId);
      }

      this.emit('templateUpdated', { template });
      this.logger.info(`Template updated: ${templateId}`);

      return template;
    } catch (error) {
      this.logger.error(`Failed to update template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    this.logger.info(`Deleting template: ${templateId}`);

    try {
      await this.templateRepo.delete(templateId);
      this.templateCache.delete(templateId);

      this.emit('templateDeleted', { templateId });
      this.logger.info(`Template deleted: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: StrategyCategory,
    limit?: number
  ): Promise<StrategyTemplate[]> {
    try {
      return await this.templateRepo.findByCategory(category, limit);
    } catch (error) {
      this.logger.error(`Failed to get templates by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(limit: number = 10): Promise<StrategyTemplate[]> {
    try {
      return await this.templateRepo.findFeatured(limit);
    } catch (error) {
      this.logger.error('Failed to get featured templates:', error);
      throw error;
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(searchTerm: string, limit: number = 20): Promise<StrategyTemplate[]> {
    try {
      return await this.templateRepo.search(searchTerm, limit);
    } catch (error) {
      this.logger.error('Failed to search templates:', error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStatistics(templateId: string): Promise<{
    usageCount: number;
    activeUsers: number;
    totalInstances: number;
    averagePerformance?: number;
  }> {
    try {
      return await this.templateRepo.getStatistics(templateId);
    } catch (error) {
      this.logger.error(`Failed to get statistics for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Publish template
   */
  async publishTemplate(templateId: string): Promise<StrategyTemplate> {
    this.logger.info(`Publishing template: ${templateId}`);

    try {
      const template = await this.templateRepo.update(templateId, { published: true });
      this.templateCache.set(templateId, template);

      this.emit('templatePublished', { template });
      this.logger.info(`Template published: ${templateId}`);

      return template;
    } catch (error) {
      this.logger.error(`Failed to publish template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Unpublish template
   */
  async unpublishTemplate(templateId: string): Promise<StrategyTemplate> {
    this.logger.info(`Unpublishing template: ${templateId}`);

    try {
      const template = await this.templateRepo.update(templateId, { published: false });
      this.templateCache.delete(templateId);

      this.emit('templateUnpublished', { template });
      this.logger.info(`Template unpublished: ${templateId}`);

      return template;
    } catch (error) {
      this.logger.error(`Failed to unpublish template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Feature template
   */
  async featureTemplate(templateId: string): Promise<StrategyTemplate> {
    this.logger.info(`Featuring template: ${templateId}`);

    try {
      const template = await this.templateRepo.update(templateId, { featured: true });
      
      if (template.published) {
        this.templateCache.set(templateId, template);
      }

      this.emit('templateFeatured', { template });
      this.logger.info(`Template featured: ${templateId}`);

      return template;
    } catch (error) {
      this.logger.error(`Failed to feature template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Validate template structure
   */
  private validateTemplateStructure(data: Partial<CreateStrategyTemplateDto>): void {
    const errors: string[] = [];

    // Validate parameters
    if (data.parameters) {
      if (!Array.isArray(data.parameters)) {
        errors.push('Parameters must be an array');
      } else {
        data.parameters.forEach((param, index) => {
          if (!param.key || !param.label || !param.type) {
            errors.push(`Parameter ${index}: missing required fields (key, label, type)`);
          }
          if (!param.validation) {
            errors.push(`Parameter ${index}: missing validation rules`);
          }
        });
      }
    }

    // Validate workflow definition
    if (data.workflowDefinition) {
      if (!data.workflowDefinition.trigger) {
        errors.push('Workflow definition must have a trigger');
      }
      if (!data.workflowDefinition.stages) {
        errors.push('Workflow definition must have stages');
      } else {
        const stages = data.workflowDefinition.stages;
        if (!stages.monitor || !stages.analyze || !stages.execute || !stages.verify) {
          errors.push('Workflow must have all stages: monitor, analyze, execute, verify');
        }
      }
    }

    // Validate risk profile
    if (data.riskProfile) {
      const risk = data.riskProfile;
      if (!risk.level) {
        errors.push('Risk profile must have a level');
      }
      if (risk.maxLossPerTrade === undefined || risk.maxLossPerTrade < 0 || risk.maxLossPerTrade > 100) {
        errors.push('Risk profile: maxLossPerTrade must be between 0 and 100');
      }
      if (risk.maxDailyLoss === undefined || risk.maxDailyLoss < 0 || risk.maxDailyLoss > 100) {
        errors.push('Risk profile: maxDailyLoss must be between 0 and 100');
      }
      if (risk.maxPositionSize === undefined || risk.maxPositionSize < 0 || risk.maxPositionSize > 100) {
        errors.push('Risk profile: maxPositionSize must be between 0 and 100');
      }
      if (risk.requiredCapital === undefined || risk.requiredCapital < 0) {
        errors.push('Risk profile: requiredCapital must be >= 0');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Template validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Reload template from database (refresh cache)
   */
  async reloadTemplate(templateId: string): Promise<void> {
    try {
      const template = await this.templateRepo.findById(templateId);
      
      if (template && template.published) {
        this.templateCache.set(templateId, template);
      } else {
        this.templateCache.delete(templateId);
      }
    } catch (error) {
      this.logger.error(`Failed to reload template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.info('Template cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.templateCache.size;
  }
}
