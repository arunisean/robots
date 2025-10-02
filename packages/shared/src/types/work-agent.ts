import { AgentConfig, AgentInput, AgentOutput, AgentCategory } from './agent';

// Work Agent特定类型

// 数据源类型
export enum DataSourceType {
  WEB_SCRAPING = 'web_scraping',
  API = 'api',
  SOCIAL_MEDIA = 'social_media',
  RSS = 'rss',
  DATABASE = 'database',
  FILE = 'file'
}

// 数据源配置
export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  url: string;
  config: DataSourceConfig;
  headers?: Record<string, string>;
  authentication?: AuthConfig;
}

// 数据源配置
export interface DataSourceConfig {
  // Web抓取配置
  selectors?: {
    title?: string;
    content?: string;
    links?: string;
    images?: string;
    metadata?: Record<string, string>;
  };
  
  // API配置
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
  
  // 社交媒体配置
  platform?: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  query?: string;
  filters?: Record<string, any>;
  
  // 通用配置
  rateLimit?: {
    requests: number;
    period: number; // seconds
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

// 认证配置
export interface AuthConfig {
  type: 'bearer' | 'basic' | 'oauth' | 'api_key';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
}

// 采集规则
export interface CollectionRule {
  id: string;
  name: string;
  description: string;
  selector: string;
  attribute?: string;
  transform?: TransformRule[];
  validation?: ValidationRule[];
}

// 转换规则
export interface TransformRule {
  type: 'regex' | 'replace' | 'trim' | 'lowercase' | 'uppercase' | 'date';
  pattern?: string;
  replacement?: string;
  format?: string;
}

// 验证规则
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  pattern?: string;
  customValidator?: string;
}

// 采集的数据
export interface CollectedData {
  id: string;
  sourceId: string;
  url: string;
  title?: string;
  content: string;
  metadata: CollectedMetadata;
  media: MediaFile[];
  collectedAt: Date;
  hash: string; // 用于去重
}

// 采集元数据
export interface CollectedMetadata {
  author?: string;
  publishedAt?: Date;
  tags?: string[];
  category?: string;
  language?: string;
  wordCount?: number;
  readingTime?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// 媒体文件
export interface MediaFile {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  metadata?: MediaMetadata;
}

// 媒体元数据
export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number; // seconds
  format?: string;
  quality?: string;
  thumbnail?: string;
}

// Work Agent配置
export interface WorkAgentConfig extends AgentConfig {
  category: AgentCategory.WORK;
  dataSources: DataSource[];
  collectionRules: CollectionRule[];
  outputFormat: 'json' | 'xml' | 'csv' | 'markdown';
  deduplication: {
    enabled: boolean;
    method: 'hash' | 'content' | 'url';
    threshold?: number;
  };
  storage: {
    type: 'database' | 's3' | 'local';
    config: Record<string, any>;
  };
}

// Work Agent输入
export interface WorkAgentInput extends AgentInput {
  targets: DataTarget[];
  rules?: CollectionRule[];
}

// 数据目标
export interface DataTarget {
  url: string;
  type: DataSourceType;
  config?: DataSourceConfig;
}

// Work Agent输出
export interface WorkAgentOutput extends AgentOutput {
  data: CollectedData[];
  summary: CollectionSummary;
}

// 采集摘要
export interface CollectionSummary {
  totalItems: number;
  newItems: number;
  duplicateItems: number;
  errorItems: number;
  totalSize: number; // bytes
  processingTime: number; // milliseconds
  sources: string[];
}