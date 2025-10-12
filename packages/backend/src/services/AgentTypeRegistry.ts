import { 
  AgentTypeDefinition, 
  AgentTypeSummary,
  AgentCategory,
  AgentConfigSchema,
  ConfigPreset
} from '@multi-agent-platform/shared';
import { logger } from '../utils/logger';

/**
 * Agent Type Registry Service
 * 管理所有可用的Agent类型定义
 */
export class AgentTypeRegistry {
  private types: Map<string, AgentTypeDefinition> = new Map();
  private static instance: AgentTypeRegistry;

  private constructor() {
    this.registerDefaultTypes();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AgentTypeRegistry {
    if (!AgentTypeRegistry.instance) {
      AgentTypeRegistry.instance = new AgentTypeRegistry();
    }
    return AgentTypeRegistry.instance;
  }

  /**
   * 注册Agent类型
   */
  public registerType(definition: AgentTypeDefinition): void {
    if (this.types.has(definition.id)) {
      logger.warn(`Agent type ${definition.id} is already registered, overwriting...`);
    }
    
    this.types.set(definition.id, definition);
    logger.info(`Registered agent type: ${definition.id}`);
  }

  /**
   * 批量注册Agent类型
   */
  public registerTypes(definitions: AgentTypeDefinition[]): void {
    definitions.forEach(def => this.registerType(def));
  }

  /**
   * 获取所有Agent类型
   */
  public getAllTypes(): AgentTypeDefinition[] {
    return Array.from(this.types.values());
  }

  /**
   * 获取所有Agent类型摘要（用于列表展示）
   */
  public getAllTypeSummaries(): AgentTypeSummary[] {
    return this.getAllTypes().map(type => this.toSummary(type));
  }

  /**
   * 按Category获取Agent类型
   */
  public getTypesByCategory(category: AgentCategory): AgentTypeDefinition[] {
    return this.getAllTypes().filter(type => type.category === category);
  }

  /**
   * 按Category获取Agent类型摘要
   */
  public getTypeSummariesByCategory(category: AgentCategory): AgentTypeSummary[] {
    return this.getTypesByCategory(category).map(type => this.toSummary(type));
  }

  /**
   * 获取单个Agent类型
   */
  public getType(typeId: string): AgentTypeDefinition | undefined {
    return this.types.get(typeId);
  }

  /**
   * 检查Agent类型是否存在
   */
  public hasType(typeId: string): boolean {
    return this.types.has(typeId);
  }

  /**
   * 搜索Agent类型
   */
  public searchTypes(query: string): AgentTypeDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTypes().filter(type => 
      type.name.toLowerCase().includes(lowerQuery) ||
      type.displayName.zh.toLowerCase().includes(lowerQuery) ||
      type.displayName.en.toLowerCase().includes(lowerQuery) ||
      type.description.toLowerCase().includes(lowerQuery) ||
      type.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 搜索Agent类型摘要
   */
  public searchTypeSummaries(query: string): AgentTypeSummary[] {
    return this.searchTypes(query).map(type => this.toSummary(type));
  }

  /**
   * 筛选Agent类型
   */
  public filterTypes(filters: {
    category?: AgentCategory;
    complexity?: 'easy' | 'medium' | 'hard';
    status?: 'stable' | 'beta' | 'experimental' | 'deprecated';
    tags?: string[];
    minRating?: number;
  }): AgentTypeDefinition[] {
    let results = this.getAllTypes();

    if (filters.category) {
      results = results.filter(type => type.category === filters.category);
    }

    if (filters.complexity) {
      results = results.filter(type => type.complexity === filters.complexity);
    }

    if (filters.status) {
      results = results.filter(type => type.status === filters.status);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(type => 
        filters.tags!.some(tag => type.tags.includes(tag))
      );
    }

    if (filters.minRating !== undefined) {
      results = results.filter(type => type.rating >= filters.minRating!);
    }

    return results;
  }

  /**
   * 获取Agent类型的配置预设
   */
  public getPresets(typeId: string): ConfigPreset[] {
    const type = this.getType(typeId);
    return type?.configPresets || [];
  }

  /**
   * 获取特定配置预设
   */
  public getPreset(typeId: string, presetId: string): ConfigPreset | undefined {
    const presets = this.getPresets(typeId);
    return presets.find(preset => preset.id === presetId);
  }

  /**
   * 验证配置
   */
  public validateConfig(typeId: string, config: any): {
    isValid: boolean;
    errors: string[];
  } {
    const type = this.getType(typeId);
    
    if (!type) {
      return {
        isValid: false,
        errors: [`Unknown agent type: ${typeId}`]
      };
    }

    const errors: string[] = [];
    const schema = type.configSchema;

    // 检查必需字段
    for (const requiredField of schema.required) {
      if (!(requiredField in config)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }

    // 验证字段类型和约束
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      if (fieldName in config) {
        const value = config[fieldName];
        const fieldErrors = this.validateField(fieldName, value, fieldSchema);
        errors.push(...fieldErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证单个字段
   */
  private validateField(fieldName: string, value: any, schema: any): string[] {
    const errors: string[] = [];

    // 类型检查
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (schema.type === 'object' && actualType !== 'object') {
      errors.push(`Field ${fieldName}: expected object, got ${actualType}`);
    } else if (schema.type !== 'object' && schema.type !== actualType) {
      errors.push(`Field ${fieldName}: expected ${schema.type}, got ${actualType}`);
    }

    // 数值范围检查
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`Field ${fieldName}: value ${value} is less than minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`Field ${fieldName}: value ${value} is greater than maximum ${schema.maximum}`);
      }
    }

    // 字符串长度检查
    if (schema.type === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`Field ${fieldName}: length ${value.length} is less than minimum ${schema.minLength}`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`Field ${fieldName}: length ${value.length} is greater than maximum ${schema.maxLength}`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push(`Field ${fieldName}: value does not match pattern ${schema.pattern}`);
      }
    }

    // 枚举检查
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Field ${fieldName}: value must be one of ${schema.enum.join(', ')}`);
    }

    return errors;
  }

  /**
   * 获取推荐的Agent类型组合
   */
  public getRecommendedTypes(scenario: string): AgentTypeDefinition[] {
    // TODO: 实现基于场景的智能推荐
    // 这里先返回一个简单的默认组合
    const recommendations: AgentTypeDefinition[] = [];

    // 根据场景关键词推荐
    if (scenario.includes('抓取') || scenario.includes('scrape') || scenario.includes('爬虫')) {
      const webScraper = this.getType('work.web_scraper');
      if (webScraper) recommendations.push(webScraper);
    }

    if (scenario.includes('生成') || scenario.includes('generate') || scenario.includes('AI')) {
      const contentGenerator = this.getType('process.content_generator');
      if (contentGenerator) recommendations.push(contentGenerator);
    }

    if (scenario.includes('发布') || scenario.includes('publish') || scenario.includes('Twitter')) {
      const twitter = this.getType('publish.twitter');
      if (twitter) recommendations.push(twitter);
    }

    return recommendations;
  }

  /**
   * 转换为摘要格式
   */
  private toSummary(type: AgentTypeDefinition): AgentTypeSummary {
    return {
      id: type.id,
      name: type.name,
      displayName: type.displayName,
      description: type.description,
      icon: type.icon,
      category: type.category,
      complexity: type.complexity,
      rating: type.rating,
      popularity: type.popularity,
      status: type.status,
      isAvailable: type.isAvailable,
      tags: type.tags
    };
  }

  /**
   * 注册默认的Agent类型
   * 这里会注册所有内置的Agent类型
   */
  private registerDefaultTypes(): void {
    // 加载示例Agent类型
    const { SAMPLE_AGENT_TYPES } = require('../data/sample-agent-types');
    this.registerTypes(SAMPLE_AGENT_TYPES);
    logger.info(`AgentTypeRegistry initialized with ${SAMPLE_AGENT_TYPES.length} agent types`);
  }

  /**
   * 获取统计信息
   */
  public getStatistics() {
    const types = this.getAllTypes();
    const byCategory = {
      work: types.filter(t => t.category === AgentCategory.WORK).length,
      process: types.filter(t => t.category === AgentCategory.PROCESS).length,
      publish: types.filter(t => t.category === AgentCategory.PUBLISH).length,
      validate: types.filter(t => t.category === AgentCategory.VALIDATE).length
    };

    const byStatus = {
      stable: types.filter(t => t.status === 'stable').length,
      beta: types.filter(t => t.status === 'beta').length,
      experimental: types.filter(t => t.status === 'experimental').length,
      deprecated: types.filter(t => t.status === 'deprecated').length
    };

    return {
      total: types.length,
      byCategory,
      byStatus,
      available: types.filter(t => t.isAvailable).length
    };
  }
}

// 导出单例实例
export const agentTypeRegistry = AgentTypeRegistry.getInstance();
