import { AgentConfig, AgentInput, AgentOutput, AgentMetrics, AgentCategory } from './agent';

// Validate Agent特定类型

// 验证类型
export enum ValidationType {
  PERFORMANCE_MONITOR = 'performance_monitor',
  QUALITY_ASSESSMENT = 'quality_assessment',
  SECURITY_SCANNER = 'security_scanner',
  RECOMMENDATION = 'recommendation'
}

// 验证规则
export interface ValidationRule {
  id: string;
  name: string;
  type: ValidationType;
  description: string;
  config: ValidationRuleConfig;
  threshold: ValidationThreshold;
  enabled: boolean;
  weight: number;
}

// 验证规则配置
export interface ValidationRuleConfig {
  // 性能监控配置
  performanceMonitor?: {
    metrics: PerformanceMetric[];
    samplingRate: number;
    alertThresholds: Record<string, number>;
    trendAnalysis: boolean;
  };
  
  // 质量评估配置
  qualityAssessment?: {
    dimensions: QualityDimension[];
    scoringMethod: 'weighted' | 'average' | 'minimum';
    benchmarks: Record<string, number>;
    userFeedbackWeight: number;
  };
  
  // 安全扫描配置
  securityScanner?: {
    scanTypes: SecurityScanType[];
    riskLevels: RiskLevel[];
    complianceChecks: ComplianceCheck[];
    realTimeMonitoring: boolean;
  };
  
  // 推荐系统配置
  recommendation?: {
    algorithm: 'collaborative' | 'content_based' | 'hybrid';
    factors: RecommendationFactor[];
    personalizedWeight: number;
    diversityFactor: number;
  };
}

// 验证阈值
export interface ValidationThreshold {
  critical: number;
  warning: number;
  good: number;
  excellent: number;
}

// 性能指标
export enum PerformanceMetric {
  EXECUTION_TIME = 'execution_time',
  SUCCESS_RATE = 'success_rate',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  RESOURCE_USAGE = 'resource_usage',
  AVAILABILITY = 'availability',
  LATENCY = 'latency'
}

// 质量维度
export interface QualityDimension {
  name: string;
  description: string;
  weight: number;
  evaluator: 'automatic' | 'llm' | 'user' | 'hybrid';
  criteria: QualityCriteria[];
}

// 质量标准
export interface QualityCriteria {
  name: string;
  description: string;
  weight: number;
  evaluationMethod: string;
  threshold: number;
}

// 安全扫描类型
export enum SecurityScanType {
  CODE_ANALYSIS = 'code_analysis',
  BEHAVIOR_MONITORING = 'behavior_monitoring',
  VULNERABILITY_SCAN = 'vulnerability_scan',
  PERMISSION_AUDIT = 'permission_audit',
  DATA_PRIVACY = 'data_privacy'
}

// 风险级别
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 合规检查
export interface ComplianceCheck {
  standard: string; // GDPR, CCPA, SOC2, etc.
  requirements: string[];
  automated: boolean;
}

// 推荐因子
export interface RecommendationFactor {
  name: string;
  weight: number;
  source: 'performance' | 'quality' | 'user_behavior' | 'similarity';
}

// 验证结果
export interface ValidationResult {
  id: string;
  agentId: string;
  validatorId: string;
  timestamp: Date;
  score: ValidationScore;
  metrics: ValidationMetrics;
  analysis: ValidationAnalysis;
  recommendations: Recommendation[];
  alerts: ValidationAlert[];
}

// 验证评分
export interface ValidationScore {
  overall: number;
  performance: number;
  quality: number;
  security: number;
  reliability: number;
  usability: number;
}

// 验证指标
export interface ValidationMetrics {
  executionMetrics: ExecutionMetrics;
  qualityMetrics: QualityMetrics;
  securityMetrics: SecurityMetrics;
  userMetrics: UserMetrics;
}

// 执行指标
export interface ExecutionMetrics {
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  resourceUtilization: ResourceUtilization;
  availability: number;
}

// 资源利用率
export interface ResourceUtilization {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

// 质量指标
export interface QualityMetrics {
  outputQuality: number;
  consistency: number;
  completeness: number;
  accuracy: number;
  relevance: number;
  userSatisfaction: number;
}

// 安全指标
export interface SecurityMetrics {
  vulnerabilityCount: number;
  riskScore: number;
  complianceScore: number;
  securityIncidents: number;
  dataPrivacyScore: number;
}

// 用户指标
export interface UserMetrics {
  adoptionRate: number;
  retentionRate: number;
  satisfactionScore: number;
  usageFrequency: number;
  feedbackScore: number;
}

// 验证分析
export interface ValidationAnalysis {
  trends: TrendAnalysis[];
  comparisons: ComparisonAnalysis[];
  insights: AnalysisInsight[];
  predictions: PerformancePrediction[];
}

// 趋势分析
export interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  confidence: number;
  timeframe: string;
}

// 对比分析
export interface ComparisonAnalysis {
  metric: string;
  comparison: 'peer_average' | 'best_in_class' | 'historical';
  value: number;
  benchmark: number;
  percentile: number;
}

// 分析洞察
export interface AnalysisInsight {
  type: 'opportunity' | 'risk' | 'anomaly' | 'pattern';
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
}

// 性能预测
export interface PerformancePrediction {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  factors: string[];
}

// 推荐建议
export interface Recommendation {
  id: string;
  type: 'optimization' | 'replacement' | 'configuration' | 'upgrade';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: ExpectedImpact;
  implementation: ImplementationGuide;
  alternatives?: Alternative[];
}

// 预期影响
export interface ExpectedImpact {
  performanceImprovement: number;
  qualityImprovement: number;
  costReduction: number;
  riskReduction: number;
  timeToValue: number; // days
}

// 实施指南
export interface ImplementationGuide {
  steps: string[];
  estimatedTime: number; // hours
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[];
  risks: string[];
}

// 替代方案
export interface Alternative {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  impact: ExpectedImpact;
}

// 验证警报
export interface ValidationAlert {
  id: string;
  type: 'performance' | 'quality' | 'security' | 'availability';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

// Validate Agent配置
export interface ValidateAgentConfig extends AgentConfig {
  category: AgentCategory.VALIDATE;
  validationRules: ValidationRule[];
  targetAgents: string[]; // Agent IDs to validate
  reportingSchedule: {
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    recipients: string[];
    format: 'summary' | 'detailed' | 'dashboard';
  };
  alerting: {
    enabled: boolean;
    channels: AlertChannel[];
    escalation: EscalationRule[];
  };
}

// 警报渠道
export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

// 升级规则
export interface EscalationRule {
  condition: string;
  delay: number; // minutes
  action: 'notify' | 'disable' | 'replace';
  recipients: string[];
}

// Validate Agent输入
export interface ValidateAgentInput extends AgentInput {
  targetAgents: string[];
  validationRules?: ValidationRule[];
  options?: ValidationOptions;
}

// 验证选项
export interface ValidationOptions {
  includeHistorical?: boolean;
  generateReport?: boolean;
  realTimeMode?: boolean;
  customThresholds?: Record<string, number>;
}

// Validate Agent输出
export interface ValidateAgentOutput extends AgentOutput {
  data: ValidationResult[];
  summary: ValidationSummary;
}

// 验证摘要
export interface ValidationSummary {
  totalAgentsValidated: number;
  averageScore: number;
  criticalIssues: number;
  recommendations: number;
  trendsIdentified: number;
  validationTime: number;
  nextValidation: Date;
}