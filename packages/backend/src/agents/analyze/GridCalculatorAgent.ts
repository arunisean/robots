import { AgentInput, AgentOutput, AgentCategory, ExecutionStatus } from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Grid level definition
 */
export interface GridLevel {
  price: number;
  action: 'buy' | 'sell' | 'none';
  filled: boolean;
  orderId?: string;
}

/**
 * Grid configuration
 */
export interface GridConfig {
  lowerBound: number;
  upperBound: number;
  gridCount: number;
  investmentPerGrid: number;
  currentPrice: number;
}

/**
 * Grid Calculator Agent
 * Calculates grid levels and determines buy/sell signals based on current price
 */
export class GridCalculatorAgent {
  private logger: Logger;
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly category: AgentCategory;
  public readonly description: string;

  constructor(config: any) {
    this.id = config.id || 'grid-calculator';
    this.name = 'Grid Calculator';
    this.description = 'Calculates grid trading levels and generates trading signals';
    this.category = AgentCategory.ANALYZE;
    this.version = '1.0.0';
    this.logger = new Logger('GridCalculatorAgent');
  }

  /**
   * Initialize agent
   */
  async initialize(): Promise<void> {
    this.logger.info('Grid Calculator Agent initialized');
  }

  /**
   * Execute grid calculation
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      // Extract grid configuration from input
      const gridConfig = this.extractGridConfig(input);
      
      // Validate configuration
      this.validateGridConfig(gridConfig);
      
      // Calculate grid levels
      const gridLevels = this.calculateGridLevels(gridConfig);
      
      // Determine current position and action
      const signal = this.determineSignal(gridConfig, gridLevels);
      
      // Check if price is out of range
      const outOfRange = this.checkOutOfRange(gridConfig);
      
      const duration = Date.now() - startTime;
      
      return {
        data: {
          gridConfig,
          gridLevels,
          signal,
          outOfRange,
          currentPrice: gridConfig.currentPrice,
          gridSpacing: (gridConfig.upperBound - gridConfig.lowerBound) / gridConfig.gridCount,
          totalGrids: gridConfig.gridCount,
          recommendation: signal.action !== 'none' 
            ? `${signal.action.toUpperCase()} at ${signal.price.toFixed(2)}`
            : 'HOLD - No action needed'
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: duration,
          version: this.version,
          format: 'json'
        },
        metrics: {
          startTime: new Date(startTime),
          duration,
          memoryUsed: process.memoryUsage().heapUsed,
          cpuUsed: 0,
          networkRequests: 0,
          errors: 0
        },
        status: ExecutionStatus.SUCCESS
      };
      
    } catch (error) {
      this.logger.error('Error in grid calculation:', error);
      
      return {
        data: {
          error: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: Date.now() - startTime,
          version: this.version,
          format: 'json'
        },
        metrics: {
          startTime: new Date(startTime),
          duration: Date.now() - startTime,
          memoryUsed: process.memoryUsage().heapUsed,
          cpuUsed: 0,
          networkRequests: 0,
          errors: 1
        },
        status: ExecutionStatus.FAILURE
      };
    }
  }

  /**
   * Extract grid configuration from input
   */
  private extractGridConfig(input: AgentInput): GridConfig {
    const data = input.data;
    
    return {
      lowerBound: Number(data.lowerBound || data.gridLowerBound || data.priceRangeLower),
      upperBound: Number(data.upperBound || data.gridUpperBound || data.priceRangeUpper),
      gridCount: Number(data.gridCount || data.numberOfGrids || 10),
      investmentPerGrid: Number(data.investmentPerGrid || data.gridInvestment || 100),
      currentPrice: Number(data.currentPrice || data.price || 0)
    };
  }

  /**
   * Validate grid configuration
   */
  private validateGridConfig(config: GridConfig): void {
    if (config.lowerBound <= 0) {
      throw new Error('Lower bound must be greater than 0');
    }
    
    if (config.upperBound <= config.lowerBound) {
      throw new Error('Upper bound must be greater than lower bound');
    }
    
    if (config.gridCount < 2) {
      throw new Error('Grid count must be at least 2');
    }
    
    if (config.investmentPerGrid <= 0) {
      throw new Error('Investment per grid must be greater than 0');
    }
    
    if (config.currentPrice <= 0) {
      throw new Error('Current price must be greater than 0');
    }
  }

  /**
   * Calculate grid levels
   */
  private calculateGridLevels(config: GridConfig): GridLevel[] {
    const levels: GridLevel[] = [];
    const gridSpacing = (config.upperBound - config.lowerBound) / config.gridCount;
    
    for (let i = 0; i <= config.gridCount; i++) {
      const price = config.lowerBound + (i * gridSpacing);
      
      // Determine action based on position relative to current price
      let action: 'buy' | 'sell' | 'none' = 'none';
      
      if (price < config.currentPrice) {
        // Below current price = buy level
        action = 'buy';
      } else if (price > config.currentPrice) {
        // Above current price = sell level
        action = 'sell';
      }
      
      levels.push({
        price,
        action,
        filled: false
      });
    }
    
    return levels;
  }

  /**
   * Determine trading signal based on current price and grid levels
   */
  private determineSignal(config: GridConfig, levels: GridLevel[]): {
    action: 'buy' | 'sell' | 'none';
    price: number;
    quantity: number;
    gridLevel: number;
    reason: string;
  } {
    // Find the nearest grid level to current price
    let nearestLevel = levels[0];
    let minDistance = Math.abs(levels[0].price - config.currentPrice);
    let levelIndex = 0;
    
    for (let i = 1; i < levels.length; i++) {
      const distance = Math.abs(levels[i].price - config.currentPrice);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = levels[i];
        levelIndex = i;
      }
    }
    
    // Calculate grid spacing
    const gridSpacing = (config.upperBound - config.lowerBound) / config.gridCount;
    const threshold = gridSpacing * 0.1; // 10% of grid spacing as threshold
    
    // If price is very close to a grid level, generate signal
    if (minDistance <= threshold) {
      const quantity = config.investmentPerGrid / nearestLevel.price;
      
      return {
        action: nearestLevel.action,
        price: nearestLevel.price,
        quantity,
        gridLevel: levelIndex,
        reason: `Price ${config.currentPrice.toFixed(2)} is near grid level ${levelIndex} at ${nearestLevel.price.toFixed(2)}`
      };
    }
    
    // No action needed
    return {
      action: 'none',
      price: config.currentPrice,
      quantity: 0,
      gridLevel: -1,
      reason: `Price ${config.currentPrice.toFixed(2)} is between grid levels, no action needed`
    };
  }

  /**
   * Check if price is out of configured range
   */
  private checkOutOfRange(config: GridConfig): {
    isOutOfRange: boolean;
    position: 'above' | 'below' | 'within';
    message: string;
  } {
    if (config.currentPrice < config.lowerBound) {
      return {
        isOutOfRange: true,
        position: 'below',
        message: `Price ${config.currentPrice.toFixed(2)} is below lower bound ${config.lowerBound.toFixed(2)}`
      };
    }
    
    if (config.currentPrice > config.upperBound) {
      return {
        isOutOfRange: true,
        position: 'above',
        message: `Price ${config.currentPrice.toFixed(2)} is above upper bound ${config.upperBound.toFixed(2)}`
      };
    }
    
    return {
      isOutOfRange: false,
      position: 'within',
      message: `Price ${config.currentPrice.toFixed(2)} is within range [${config.lowerBound.toFixed(2)}, ${config.upperBound.toFixed(2)}]`
    };
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Grid Calculator Agent cleaned up');
  }
}
