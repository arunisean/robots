import { AgentConfig, AgentInput, AgentOutput, AgentCategory } from './agent';

// Publish Agent特定类型

// 发布平台类型
export enum PublishPlatform {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  WEBSITE = 'website',
  EMAIL = 'email',
  WEBHOOK = 'webhook'
}

// 发布目标
export interface PublishTarget {
  id: string;
  platform: PublishPlatform;
  name: string;
  config: PublishTargetConfig;
  authentication: PublishAuth;
  enabled: boolean;
}

// 发布目标配置
export interface PublishTargetConfig {
  // Twitter配置
  twitter?: {
    accountId?: string;
    includeMedia?: boolean;
    threadMode?: boolean;
    hashtagStrategy?: 'preserve' | 'add' | 'remove';
    mentionStrategy?: 'preserve' | 'add' | 'remove';
  };
  
  // LinkedIn配置
  linkedin?: {
    profileId?: string;
    companyId?: string;
    visibility: 'public' | 'connections' | 'logged-in';
    includeMedia?: boolean;
  };
  
  // 网站配置
  website?: {
    url: string;
    method: 'POST' | 'PUT';
    template?: string;
    seoOptimization?: boolean;
    generateSitemap?: boolean;
  };
  
  // 邮件配置
  email?: {
    smtpConfig: SMTPConfig;
    template?: string;
    recipients: string[];
    subject?: string;
  };
  
  // 通用配置
  formatting?: ContentFormatting;
  scheduling?: SchedulingConfig;
  retryPolicy?: RetryPolicy;
}

// SMTP配置
export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

// 内容格式化
export interface ContentFormatting {
  maxLength?: number;
  truncateStrategy?: 'cut' | 'summarize' | 'split';
  imageResize?: {
    width: number;
    height: number;
    quality: number;
  };
  linkShortening?: boolean;
  hashtagLimit?: number;
}

// 调度配置
export interface SchedulingConfig {
  timezone: string;
  optimalTimes?: string[]; // HH:MM format
  avoidTimes?: string[];
  frequency?: {
    max: number;
    period: 'hour' | 'day' | 'week';
  };
}

// 重试策略
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  retryOn: string[]; // error codes
}

// 发布认证
export interface PublishAuth {
  type: 'oauth' | 'api_key' | 'bearer' | 'basic';
  credentials: Record<string, string>;
  refreshToken?: string;
  expiresAt?: Date;
}

// 发布内容
export interface PublishContent {
  id: string;
  title?: string;
  content: string;
  summary?: string;
  media: PublishMedia[];
  metadata: PublishMetadata;
  scheduling?: PublishSchedule;
}

// 发布媒体
export interface PublishMedia {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename: string;
  caption?: string;
  altText?: string;
  thumbnail?: string;
}

// 发布元数据
export interface PublishMetadata {
  tags?: string[];
  category?: string;
  language?: string;
  author?: string;
  sourceUrl?: string;
  customFields?: Record<string, any>;
}

// 发布调度
export interface PublishSchedule {
  publishAt?: Date;
  timezone?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

// 发布结果
export interface PublishResult {
  id: string;
  targetId: string;
  platform: PublishPlatform;
  status: PublishStatus;
  publishedAt?: Date;
  platformId?: string; // 平台返回的ID
  url?: string; // 发布后的URL
  metrics?: PublishMetrics;
  error?: PublishError;
}

// 发布状态
export enum PublishStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 发布指标
export interface PublishMetrics {
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  clicks?: number;
  impressions?: number;
  engagement?: number;
  reach?: number;
}

// 发布错误
export interface PublishError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

// 发布队列项
export interface PublishQueueItem {
  id: string;
  contentId: string;
  targetId: string;
  priority: number;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: PublishStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Publish Agent配置
export interface PublishAgentConfig extends AgentConfig {
  category: AgentCategory.PUBLISH;
  targets: PublishTarget[];
  defaultFormatting: ContentFormatting;
  queueConfig: {
    maxConcurrent: number;
    retryDelay: number;
    maxQueueSize: number;
  };
  analytics: {
    enabled: boolean;
    trackingPeriod: number; // days
    metricsToTrack: string[];
  };
}

// Publish Agent输入
export interface PublishAgentInput extends AgentInput {
  content: PublishContent[];
  targets?: string[]; // target IDs
  options?: PublishOptions;
}

// 发布选项
export interface PublishOptions {
  immediate?: boolean;
  dryRun?: boolean;
  skipFormatting?: boolean;
  customFormatting?: ContentFormatting;
  priority?: number;
}

// Publish Agent输出
export interface PublishAgentOutput extends AgentOutput {
  data: PublishResult[];
  summary: PublishSummary;
}

// 发布摘要
export interface PublishSummary {
  totalItems: number;
  publishedItems: number;
  scheduledItems: number;
  failedItems: number;
  platforms: string[];
  totalReach?: number;
  totalEngagement?: number;
  processingTime: number;
}