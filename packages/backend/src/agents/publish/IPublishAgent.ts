import { IAgent } from '../base/IAgent';
import { PublishTarget, PublishContent, PublishResult } from '@multi-agent-platform/shared';

/**
 * Interface for Publish Agents (content publishing and distribution agents)
 * Extends base agent interface with publishing-specific methods
 */
export interface IPublishAgent extends IAgent {
  /**
   * Set the publish target platform
   */
  setPublishTarget(target: PublishTarget): Promise<void>;

  /**
   * Schedule content for publishing
   */
  schedulePublish(content: PublishContent, schedule: PublishSchedule): Promise<void>;

  /**
   * Publish content immediately
   */
  publishNow(content: PublishContent): Promise<PublishResult>;

  /**
   * Get publishing history
   */
  getPublishHistory(): Promise<PublishRecord[]>;

  /**
   * Get publishing statistics
   */
  getPublishStats(): Promise<PublishStats>;

  /**
   * Test publishing to target platform
   */
  testPublish(content: PublishContent): Promise<PublishTestResult>;
}

/**
 * Publishing schedule configuration
 */
export interface PublishSchedule {
  publishAt?: Date;
  timezone?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

/**
 * Publishing record for history tracking
 */
export interface PublishRecord {
  id: string;
  contentId: string;
  targetId: string;
  platform: string;
  status: string;
  publishedAt?: Date;
  scheduledAt?: Date;
  url?: string;
  metrics?: PublishMetrics;
  error?: string;
}

/**
 * Publishing metrics
 */
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

/**
 * Publishing statistics
 */
export interface PublishStats {
  totalPublished: number;
  successfulPublishes: number;
  failedPublishes: number;
  averagePublishTime: number;
  totalReach: number;
  totalEngagement: number;
  lastPublishTime?: Date;
  platformStats: PlatformStats[];
}

/**
 * Platform-specific statistics
 */
export interface PlatformStats {
  platform: string;
  totalPublished: number;
  successRate: number;
  averageReach: number;
  averageEngagement: number;
  lastPublished?: Date;
}

/**
 * Publishing test result
 */
export interface PublishTestResult {
  success: boolean;
  publishTime: number;
  formattedContent: any;
  warnings: string[];
  errors: string[];
  estimatedReach?: number;
}