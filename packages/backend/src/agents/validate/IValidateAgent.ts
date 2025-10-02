import { IAgent } from '../base/IAgent';
import { ValidationResult } from '@multi-agent-platform/shared';

/**
 * Interface for Validate Agents (validation and quality assurance agents)
 * Extends base agent interface with validation-specific methods
 */
export interface IValidateAgent extends IAgent {
  /**
   * Set the validation target (agent to validate)
   */
  setValidationTarget(target: IAgent): Promise<void>;

  /**
   * Perform validation on the target
   */
  performValidation(): Promise<ValidationResult>;

  /**
   * Generate validation report
   */
  generateReport(): Promise<ValidationReport>;

  /**
   * Get validation history
   */
  getValidationHistory(): Promise<ValidationRecord[]>;

  /**
   * Get validation statistics
   */
  getValidationStats(): Promise<ValidationStats>;

  /**
   * Test validation rules with sample data
   */
  testValidation(sampleData: any): Promise<ValidationTestResult>;
}

/**
 * Comprehensive validation report
 */
export interface ValidationReport {
  id: string;
  agentId: string;
  validatorId: string;
  timestamp: Date;
  executiveSummary: string;
  overallScore: number;
  sections: ValidationReportSection[];
  recommendations: Recommendation[];
  trends: TrendAnalysis[];
  nextValidationDate: Date;
}

/**
 * Validation report section
 */
export interface ValidationReportSection {
  title: string;
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  findings: Finding[];
  metrics: Record<string, number>;
  charts?: ChartData[];
}

/**
 * Validation finding
 */
export interface Finding {
  type: 'strength' | 'weakness' | 'risk' | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation?: string;
}

/**
 * Recommendation with implementation details
 */
export interface Recommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'quality' | 'security' | 'reliability';
  title: string;
  description: string;
  expectedImpact: string;
  implementationSteps: string[];
  estimatedEffort: string;
  timeline: string;
}

/**
 * Trend analysis
 */
export interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  confidence: number;
  timeframe: string;
  significance: 'low' | 'medium' | 'high';
}

/**
 * Chart data for visualization
 */
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any[];
  labels: string[];
  colors?: string[];
}

/**
 * Validation record for history tracking
 */
export interface ValidationRecord {
  id: string;
  timestamp: Date;
  agentId: string;
  validationType: string;
  overallScore: number;
  duration: number;
  issuesFound: number;
  recommendationsGenerated: number;
  status: 'completed' | 'failed' | 'partial';
  errorMessage?: string;
}

/**
 * Validation statistics
 */
export interface ValidationStats {
  totalValidations: number;
  averageScore: number;
  averageValidationTime: number;
  trendsIdentified: number;
  recommendationsGenerated: number;
  lastValidationTime?: Date;
  validationTypeStats: ValidationTypeStats[];
  scoreDistribution: ScoreDistribution;
}

/**
 * Validation type statistics
 */
export interface ValidationTypeStats {
  type: string;
  count: number;
  averageScore: number;
  averageDuration: number;
  successRate: number;
}

/**
 * Score distribution
 */
export interface ScoreDistribution {
  excellent: number; // 90-100
  good: number;      // 70-89
  fair: number;      // 50-69
  poor: number;      // 30-49
  critical: number;  // 0-29
}

/**
 * Validation test result
 */
export interface ValidationTestResult {
  success: boolean;
  validationTime: number;
  score: number;
  findings: Finding[];
  warnings: string[];
  errors: string[];
  rulesApplied: string[];
}