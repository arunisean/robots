import { z } from 'zod';
import { AgentCategory, AgentConfig } from './agent';

/**
 * Agent Type Definition
 * 定义Agent类型的完整信息，包括配置schema、文档、预设等
 */
export interface AgentTypeDefinition {
  // 唯一标识符（格式：category.type_name）
  id: string; // 例如：'work.web_scraper'
  
  // 基本信息
  name: string; // 显示名称，例如：'Web Scraper'
  displayName: {
    zh: string; // '网页抓取器'
    en: string; // 'Web Scraper'
  };
  description: string;
  icon: string; // 图标名称或URL
  
  // 分类信息
  category: AgentCategory;
  categoryPath: string; // 例如：'WORK > Web Scraper'
  
  // 元数据
  version: string;
  author: string;
  tags: string[];
  complexity: 'easy' | 'medium' | 'hard';
  popularity: number; // 使用次数
  rating: number; // 用户评分 (0-5)
  
  // 功能特性
  features: string[];
  capabilities: string[];
  limitations: string[];
  
  // 配置定义
  configSchema: AgentConfigFormSchema;
  defaultConfig: Partial<AgentConfig>;
  configPresets: ConfigPreset[];
  
  // 依赖和要求
  requirements: AgentRequirements;
  
  // 文档和示例
  documentation: AgentDocumentation;
  
  // 状态
  status: 'stable' | 'beta' | 'experimental' | 'deprecated';
  isAvailable: boolean;
  releaseDate: Date;
  lastUpdated: Date;
}

/**
 * Configuration Preset
 * 配置预设，用于快速创建常见场景的Agent
 */
export interface ConfigPreset {
  id: string;
  name: string;
  description: string;
  scenario: string; // 适用场景
  config: Partial<AgentConfig>;
  tags: string[];
  isOfficial: boolean;
  author?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent Config Form Schema
 * 定义Agent配置的JSON Schema，用于动态生成表单和验证
 */
export interface AgentConfigFormSchema {
  type: 'object';
  properties: {
    [key: string]: ConfigFieldSchema;
  };
  required: string[];
  dependencies?: {
    [key: string]: string[]; // 字段依赖关系
  };
}

/**
 * Config Field Schema
 * 单个配置字段的定义
 */
export interface ConfigFieldSchema {
  // JSON Schema标准字段
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: ConfigFieldSchema;
  properties?: {
    [key: string]: ConfigFieldSchema;
  };
  
  // UI相关配置
  ui: ConfigFieldUI;
}

/**
 * Config Field UI
 * 配置字段的UI展示配置
 */
export interface ConfigFieldUI {
  widget: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'slider' | 'file' | 'code' | 'color' | 'date' | 'time';
  placeholder?: string;
  helpText?: string;
  group?: string; // 配置分组
  order?: number; // 显示顺序
  hidden?: boolean; // 是否隐藏
  disabled?: boolean; // 是否禁用
  conditional?: {
    field: string; // 依赖的字段名
    value?: any; // 当依赖字段等于此值时显示
    operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin'; // 比较操作符
  };
  validation?: {
    message?: string; // 自定义验证错误消息
    async?: boolean; // 是否需要异步验证
  };
}

/**
 * Agent Requirements
 * Agent的系统要求和依赖
 */
export interface AgentRequirements {
  minMemory: number; // MB
  minCpu: number; // cores
  minStorage: number; // MB
  dependencies: string[]; // 依赖的包或服务
  permissions: string[]; // 需要的权限
  apiKeys?: string[]; // 需要的API密钥
}

/**
 * Agent Documentation
 * Agent的文档信息
 */
export interface AgentDocumentation {
  overview: string; // 概述
  quickStart: string; // 快速开始指南
  apiReference: string; // API参考文档
  examples: CodeExample[]; // 代码示例
  faq?: FAQItem[]; // 常见问题
  changelog?: ChangelogEntry[]; // 更新日志
}

/**
 * Code Example
 * 代码示例
 */
export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: 'typescript' | 'javascript' | 'json' | 'yaml';
  tags: string[];
}

/**
 * FAQ Item
 * 常见问题条目
 */
export interface FAQItem {
  question: string;
  answer: string;
  tags: string[];
}

/**
 * Changelog Entry
 * 更新日志条目
 */
export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  breaking?: boolean;
}

/**
 * Agent Type Summary
 * Agent类型摘要信息（用于列表展示）
 */
export interface AgentTypeSummary {
  id: string;
  name: string;
  displayName: {
    zh: string;
    en: string;
  };
  description: string;
  icon: string;
  category: AgentCategory;
  complexity: 'easy' | 'medium' | 'hard';
  rating: number;
  popularity: number;
  status: 'stable' | 'beta' | 'experimental' | 'deprecated';
  isAvailable: boolean;
  tags: string[];
}

// Zod Validation Schemas

export const ConfigFieldUISchema = z.object({
  widget: z.enum(['input', 'textarea', 'select', 'checkbox', 'radio', 'slider', 'file', 'code', 'color', 'date', 'time']),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  group: z.string().optional(),
  order: z.number().optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
  conditional: z.object({
    field: z.string(),
    value: z.any().optional(),
    operator: z.enum(['eq', 'ne', 'gt', 'lt', 'in', 'nin']).optional()
  }).optional(),
  validation: z.object({
    message: z.string().optional(),
    async: z.boolean().optional()
  }).optional()
});

export const ConfigFieldSchemaZod: z.ZodType<ConfigFieldSchema> = z.lazy(() => z.object({
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  title: z.string(),
  description: z.string(),
  default: z.any().optional(),
  enum: z.array(z.any()).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
  items: ConfigFieldSchemaZod.optional(),
  properties: z.record(ConfigFieldSchemaZod).optional(),
  ui: ConfigFieldUISchema
}));

export const AgentConfigSchemaZod = z.object({
  type: z.literal('object'),
  properties: z.record(ConfigFieldSchemaZod),
  required: z.array(z.string()),
  dependencies: z.record(z.array(z.string())).optional()
});

export const ConfigPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  scenario: z.string(),
  config: z.record(z.any()),
  tags: z.array(z.string()),
  isOfficial: z.boolean(),
  author: z.string().optional(),
  usageCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const AgentTypeDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z]+\.[a-z_]+$/), // 格式：category.type_name
  name: z.string(),
  displayName: z.object({
    zh: z.string(),
    en: z.string()
  }),
  description: z.string(),
  icon: z.string(),
  category: z.nativeEnum(AgentCategory),
  categoryPath: z.string(),
  version: z.string(),
  author: z.string(),
  tags: z.array(z.string()),
  complexity: z.enum(['easy', 'medium', 'hard']),
  popularity: z.number().min(0),
  rating: z.number().min(0).max(5),
  features: z.array(z.string()),
  capabilities: z.array(z.string()),
  limitations: z.array(z.string()),
  configSchema: AgentConfigSchemaZod,
  defaultConfig: z.record(z.any()),
  configPresets: z.array(ConfigPresetSchema),
  requirements: z.object({
    minMemory: z.number(),
    minCpu: z.number(),
    minStorage: z.number(),
    dependencies: z.array(z.string()),
    permissions: z.array(z.string()),
    apiKeys: z.array(z.string()).optional()
  }),
  documentation: z.object({
    overview: z.string(),
    quickStart: z.string(),
    apiReference: z.string(),
    examples: z.array(z.object({
      title: z.string(),
      description: z.string(),
      code: z.string(),
      language: z.enum(['typescript', 'javascript', 'json', 'yaml']),
      tags: z.array(z.string())
    })),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
      tags: z.array(z.string())
    })).optional(),
    changelog: z.array(z.object({
      version: z.string(),
      date: z.date(),
      changes: z.array(z.string()),
      breaking: z.boolean().optional()
    })).optional()
  }),
  status: z.enum(['stable', 'beta', 'experimental', 'deprecated']),
  isAvailable: z.boolean(),
  releaseDate: z.date(),
  lastUpdated: z.date()
});
