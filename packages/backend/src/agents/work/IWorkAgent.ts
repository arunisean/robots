import { IAgent } from '../base/IAgent';
import { DataSource, CollectedData } from '@multi-agent-platform/shared';

/**
 * Interface for Work Agents (data collection agents)
 * Extends base agent interface with collection-specific methods
 */
export interface IWorkAgent extends IAgent {
  /**
   * Set the data collection target
   */
  setTarget(target: DataSource): Promise<void>;

  /**
   * Start the data collection process
   */
  startCollection(): Promise<void>;

  /**
   * Stop the data collection process
   */
  stopCollection(): Promise<void>;

  /**
   * Get collected data with optional filtering
   */
  getCollectedData(filter?: DataFilter): Promise<CollectedData[]>;

  /**
   * Get collection statistics
   */
  getCollectionStats(): Promise<CollectionStats>;

  /**
   * Test connection to data source
   */
  testConnection(source: DataSource): Promise<boolean>;
}

/**
 * Data filtering options
 */
export interface DataFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  sourceIds?: string[];
  contentType?: string[];
  tags?: string[];
  minSize?: number;
  maxSize?: number;
  searchQuery?: string;
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  totalCollected: number;
  successfulCollections: number;
  failedCollections: number;
  averageCollectionTime: number;
  lastCollectionTime?: Date;
  dataSourceStats: DataSourceStats[];
}

/**
 * Data source statistics
 */
export interface DataSourceStats {
  sourceId: string;
  sourceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  errorRate: number;
}