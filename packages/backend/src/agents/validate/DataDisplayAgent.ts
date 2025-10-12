/**
 * DataDisplayAgent
 * A special agent for displaying intermediate data in workflows
 * Can be inserted at any position to inspect data flow
 */

import { ValidateAgent } from './ValidateAgent';
import { AgentExecutionResult } from '../base/IAgent';

export interface DataDisplayConfig {
  name: string;
  description?: string;
  enabled?: boolean;
  displayFormat?: 'json' | 'table' | 'text' | 'summary';
  fieldsToDisplay?: string[]; // Specific fields to display, empty = all
  maxDepth?: number; // Max depth for nested objects
  truncateLength?: number; // Max length for string values
  highlightChanges?: boolean; // Highlight changes from previous step
}

export class DataDisplayAgent extends ValidateAgent {
  async execute(input: any): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const config = this.config as DataDisplayConfig;

    try {
      this.logger.info(`DataDisplayAgent executing: ${config.name}`);

      // If disabled, just pass through
      if (config.enabled === false) {
        return {
          success: true,
          data: input,
          metadata: {
            agentId: this.id,
            agentType: this.type,
            executionTime: Date.now() - startTime,
            message: 'Data display disabled, passing through',
          },
        };
      }

      // Format data for display
      const displayData = this.formatDataForDisplay(input, config);

      // Generate summary
      const summary = this.generateSummary(input);

      // Pass through original data unchanged
      return {
        success: true,
        data: input, // Pass through unchanged
        metadata: {
          agentId: this.id,
          agentType: this.type,
          executionTime: Date.now() - startTime,
          displayData, // Data formatted for display
          summary, // Summary information
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error('DataDisplayAgent execution failed:', error);
      
      // Even on error, pass through the input data
      return {
        success: false,
        data: input,
        error: error.message,
        metadata: {
          agentId: this.id,
          agentType: this.type,
          executionTime: Date.now() - startTime,
          error: error.message,
        },
      };
    }
  }

  /**
   * Format data for display based on configuration
   */
  private formatDataForDisplay(data: any, config: DataDisplayConfig): any {
    const format = config.displayFormat || 'json';
    const maxDepth = config.maxDepth || 5;
    const truncateLength = config.truncateLength || 1000;

    switch (format) {
      case 'json':
        return this.formatAsJSON(data, maxDepth, truncateLength);
      
      case 'table':
        return this.formatAsTable(data);
      
      case 'text':
        return this.formatAsText(data, truncateLength);
      
      case 'summary':
        return this.formatAsSummary(data);
      
      default:
        return data;
    }
  }

  /**
   * Format as JSON with depth and length limits
   */
  private formatAsJSON(data: any, maxDepth: number, truncateLength: number): any {
    const truncate = (obj: any, depth: number): any => {
      if (depth > maxDepth) {
        return '[Max depth reached]';
      }

      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj === 'string') {
        return obj.length > truncateLength 
          ? obj.substring(0, truncateLength) + '...' 
          : obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => truncate(item, depth + 1));
      }

      if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = truncate(value, depth + 1);
        }
        return result;
      }

      return obj;
    };

    return truncate(data, 0);
  }

  /**
   * Format as table (for arrays of objects)
   */
  private formatAsTable(data: any): any {
    if (!Array.isArray(data)) {
      return { error: 'Table format requires array data', data };
    }

    if (data.length === 0) {
      return { headers: [], rows: [] };
    }

    // Extract headers from first object
    const firstItem = data[0];
    if (typeof firstItem !== 'object') {
      return { error: 'Table format requires array of objects', data };
    }

    const headers = Object.keys(firstItem);
    const rows = data.map(item => 
      headers.map(header => item[header])
    );

    return { headers, rows, count: data.length };
  }

  /**
   * Format as plain text
   */
  private formatAsText(data: any, truncateLength: number): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > truncateLength 
      ? text.substring(0, truncateLength) + '...' 
      : text;
  }

  /**
   * Format as summary
   */
  private formatAsSummary(data: any): any {
    return {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : undefined,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : undefined,
      sample: Array.isArray(data) ? data.slice(0, 3) : data,
    };
  }

  /**
   * Generate summary information
   */
  private generateSummary(data: any): any {
    const summary: any = {
      type: Array.isArray(data) ? 'array' : typeof data,
      timestamp: new Date().toISOString(),
    };

    if (Array.isArray(data)) {
      summary.count = data.length;
      summary.isEmpty = data.length === 0;
    } else if (typeof data === 'object' && data !== null) {
      summary.keys = Object.keys(data);
      summary.keyCount = Object.keys(data).length;
    } else if (typeof data === 'string') {
      summary.length = data.length;
    }

    return summary;
  }

  async cleanup(): Promise<void> {
    this.logger.info('DataDisplayAgent cleanup');
  }
}
