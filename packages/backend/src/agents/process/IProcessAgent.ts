import { IAgent } from '../base/IAgent';
import { ProcessingRule, ProcessedData } from '@multi-agent-platform/shared';

/**
 * Interface for Process Agents (data processing and transformation agents)
 * Extends base agent interface with processing-specific methods
 */
export interface IProcessAgent extends IAgent {
  /**
   * Set processing rules for the agent
   */
  setProcessingRules(rules: ProcessingRule[]): Promise<void>;

  /**
   * Process data using configured rules
   */
  processData(data: any): Promise<ProcessedData>;

  /**
   * Get processing history
   */
  getProcessingHistory(): Promise<ProcessingRecord[]>;

  /**
   * Get processing statistics
   */
  getProcessingStats?(): Promise<ProcessingStats>;

  /**
   * Test processing pipeline with sample data
   */
  testProcessing?(sampleData: any): Promise<ProcessingTestResult>;
}

/**
 * Processing record for history tracking
 */
export interface ProcessingRecord {
  id: string;
  timestamp: Date;
  inputSize: number;
  outputSize: number;
  processingTime: number;
  rulesApplied: string[];
  qualityScore: number;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
}

/**
 * Processing statistics
 */
export interface ProcessingStats {
  totalProcessed: number;
  successfulProcessing: number;
  failedProcessing: number;
  averageProcessingTime: number;
  averageQualityScore: number;
  lastProcessingTime?: Date;
  ruleStats: RuleStats[];
  llmUsage?: LLMUsageStats;
}

/**
 * Rule-specific statistics
 */
export interface RuleStats {
  ruleName: string;
  ruleType: string;
  timesApplied: number;
  averageExecutionTime: number;
  successRate: number;
  lastApplied?: Date;
}

/**
 * LLM usage statistics
 */
export interface LLMUsageStats {
  provider: string;
  model: string;
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  averageResponseTime: number;
}

/**
 * Processing test result
 */
export interface ProcessingTestResult {
  success: boolean;
  processingTime: number;
  qualityScore: number;
  output: any;
  warnings: string[];
  errors: string[];
  rulesApplied: string[];
}