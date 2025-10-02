import { AgentConfig, AgentInput, AgentOutput, AgentCategory } from './agent';

// Process Agent特定类型

// 处理类型
export enum ProcessingType {
  TEXT_PROCESSING = 'text_processing',
  CONTENT_GENERATION = 'content_generation',
  DATA_TRANSFORMATION = 'data_transformation',
  QUALITY_CONTROL = 'quality_control',
  TRANSLATION = 'translation',
  SUMMARIZATION = 'summarization',
  SENTIMENT_ANALYSIS = 'sentiment_analysis'
}

// 处理规则
export interface ProcessingRule {
  id: string;
  name: string;
  type: ProcessingType;
  description: string;
  config: ProcessingRuleConfig;
  order: number;
  enabled: boolean;
}

// 处理规则配置
export interface ProcessingRuleConfig {
  // 文本处理配置
  textProcessing?: {
    operations: TextOperation[];
    language?: string;
    preserveFormatting?: boolean;
  };
  
  // 内容生成配置
  contentGeneration?: {
    template?: string;
    style?: 'formal' | 'casual' | 'creative' | 'technical';
    tone?: 'positive' | 'neutral' | 'negative';
    length?: 'short' | 'medium' | 'long';
    includeImages?: boolean;
  };
  
  // 数据转换配置
  dataTransformation?: {
    inputFormat: string;
    outputFormat: string;
    mapping: FieldMapping[];
    aggregation?: AggregationRule[];
  };
  
  // 质量控制配置
  qualityControl?: {
    checks: QualityCheck[];
    threshold: number;
    action: 'reject' | 'flag' | 'fix';
  };
  
  // LLM配置
  llmConfig?: LLMConfig;
}

// 文本操作
export interface TextOperation {
  type: 'clean' | 'extract' | 'replace' | 'format' | 'validate';
  pattern?: string;
  replacement?: string;
  options?: Record<string, any>;
}

// 字段映射
export interface FieldMapping {
  source: string;
  target: string;
  transform?: string;
  defaultValue?: any;
}

// 聚合规则
export interface AggregationRule {
  field: string;
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'concat';
  groupBy?: string[];
}

// 质量检查
export interface QualityCheck {
  type: 'length' | 'language' | 'sentiment' | 'readability' | 'plagiarism' | 'custom';
  config: Record<string, any>;
  weight: number;
}

// LLM配置
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userPrompt?: string;
  apiKey?: string;
  endpoint?: string;
}

// 处理后的数据
export interface ProcessedData {
  id: string;
  sourceId: string;
  originalData: any;
  processedContent: ProcessedContent;
  metadata: ProcessedMetadata;
  qualityScore: QualityScore;
  processedAt: Date;
}

// 处理后的内容
export interface ProcessedContent {
  title?: string;
  content: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
  category?: string;
  media?: ProcessedMedia[];
}

// 处理后的媒体
export interface ProcessedMedia {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
  altText?: string;
  metadata?: Record<string, any>;
}

// 处理元数据
export interface ProcessedMetadata {
  processingRules: string[];
  processingTime: number;
  llmUsage?: LLMUsage;
  transformations: string[];
  language?: string;
  readabilityScore?: number;
  sentimentScore?: number;
}

// LLM使用情况
export interface LLMUsage {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// 质量评分
export interface QualityScore {
  overall: number;
  dimensions: QualityDimension[];
  issues: QualityIssue[];
  recommendations: string[];
}

// 质量维度
export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  description: string;
}

// 质量问题
export interface QualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion?: string;
}

// Process Agent配置
export interface ProcessAgentConfig extends AgentConfig {
  category: AgentCategory.PROCESS;
  processingRules: ProcessingRule[];
  inputFormat: string[];
  outputFormat: string;
  qualityThreshold: number;
  llmConfig?: LLMConfig;
  batchSize?: number;
  parallelProcessing?: boolean;
}

// Process Agent输入
export interface ProcessAgentInput extends AgentInput {
  data: any[];
  rules?: ProcessingRule[];
  options?: ProcessingOptions;
}

// 处理选项
export interface ProcessingOptions {
  batchSize?: number;
  parallel?: boolean;
  skipQualityCheck?: boolean;
  customPrompt?: string;
  outputFormat?: string;
}

// Process Agent输出
export interface ProcessAgentOutput extends AgentOutput {
  data: ProcessedData[];
  summary: ProcessingSummary;
}

// 处理摘要
export interface ProcessingSummary {
  totalItems: number;
  processedItems: number;
  failedItems: number;
  averageQualityScore: number;
  processingTime: number;
  llmUsage?: LLMUsage;
  rulesApplied: string[];
}