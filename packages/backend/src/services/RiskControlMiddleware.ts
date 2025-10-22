import { Logger } from '../utils/logger';
import { RiskControlConfig } from '@multi-agent-platform/shared';

/**
 * Risk check result for a single check
 */
export interface RiskCheck {
  type: 'position_size' | 'daily_loss' | 'concurrent_trades' | 'cooldown' | 'max_loss_per_trade';
  passed: boolean;
  reason?: string;
  currentValue?: number;
  limitValue?: number;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Overall risk check result
 */
export interface RiskCheckResult {
  allowed: boolean;
  checks: RiskCheck[];
  warnings: string[];
  timestamp: Date;
}

/**
 * Trade result for tracking P&L
 */
export interface TradeResult {
  userId: string;
  strategyInstanceId?: string;
  profitLoss: number; // in base currency (e.g., USDT)
  profitLossPercentage: number; // percentage of trade size
  tradeSize: number;
  timestamp: Date;
  executionId?: string;
}

/**
 * User risk state
 */
interface UserRiskState {
  dailyLoss: number; // cumulative loss for today
  lastLossTimestamp?: Date;
  activeTrades: number;
  lastResetDate: string; // YYYY-MM-DD format
}

/**
 * Risk Control Middleware
 * Enforces trading risk limits to protect user capital
 */
export class RiskControlMiddleware {
  private logger: Logger;
  private userStates: Map<string, UserRiskState>;

  constructor() {
    this.logger = new Logger('RiskControlMiddleware');
    this.userStates = new Map();
  }

  /**
   * Check if trade is allowed based on risk controls
   */
  async checkBeforeExecution(
    userId: string,
    tradeSize: number,
    portfolioValue: number,
    config: RiskControlConfig,
    strategyInstanceId?: string
  ): Promise<RiskCheckResult> {
    this.logger.info(`Checking risk controls for user ${userId}, trade size: ${tradeSize}`);

    // Ensure user state exists and is current
    this.ensureUserState(userId);

    const checks: RiskCheck[] = [];
    const warnings: string[] = [];

    // 1. Check position size limit
    const positionCheck = this.checkPositionSize(tradeSize, portfolioValue, config);
    checks.push(positionCheck);
    if (!positionCheck.passed) {
      this.logger.warn(`Position size check failed for user ${userId}`);
    }

    // 2. Check daily loss limit
    const dailyLossCheck = this.checkDailyLoss(userId, config);
    checks.push(dailyLossCheck);
    if (!dailyLossCheck.passed) {
      this.logger.warn(`Daily loss limit exceeded for user ${userId}`);
    }

    // 3. Check concurrent trades limit
    const concurrentCheck = this.checkConcurrentTrades(userId, config);
    checks.push(concurrentCheck);
    if (!concurrentCheck.passed) {
      this.logger.warn(`Concurrent trades limit exceeded for user ${userId}`);
    }

    // 4. Check cooldown period after losses
    const cooldownCheck = this.checkCooldownPeriod(userId, config);
    checks.push(cooldownCheck);
    if (!cooldownCheck.passed) {
      this.logger.warn(`User ${userId} is in cooldown period`);
    }

    // 5. Check max loss per trade
    const maxLossCheck = this.checkMaxLossPerTrade(tradeSize, portfolioValue, config);
    checks.push(maxLossCheck);
    if (!maxLossCheck.passed) {
      this.logger.warn(`Max loss per trade check failed for user ${userId}`);
    }

    // Generate warnings for checks that are close to limits
    for (const check of checks) {
      if (check.passed && check.severity === 'warning') {
        warnings.push(`${check.type}: ${check.reason}`);
      }
    }

    // Determine if trade is allowed (all critical checks must pass)
    const allowed = checks.every(check => check.passed);

    const result: RiskCheckResult = {
      allowed,
      checks,
      warnings,
      timestamp: new Date()
    };

    this.logger.info(
      `Risk check result for user ${userId}: ${allowed ? 'ALLOWED' : 'BLOCKED'} ` +
      `(${checks.filter(c => c.passed).length}/${checks.length} checks passed)`
    );

    return result;
  }

  /**
   * Check position size limit
   */
  private checkPositionSize(
    tradeSize: number,
    portfolioValue: number,
    config: RiskControlConfig
  ): RiskCheck {
    const maxPositionValue = portfolioValue * (config.maxPositionSize / 100);
    const positionPercentage = (tradeSize / portfolioValue) * 100;

    const passed = tradeSize <= maxPositionValue;
    const severity = positionPercentage > config.maxPositionSize * 0.8 ? 'warning' : 'info';

    return {
      type: 'position_size',
      passed,
      reason: passed
        ? `Position size ${positionPercentage.toFixed(2)}% is within limit`
        : `Position size ${positionPercentage.toFixed(2)}% exceeds limit of ${config.maxPositionSize}%`,
      currentValue: positionPercentage,
      limitValue: config.maxPositionSize,
      severity: passed ? severity : 'critical'
    };
  }

  /**
   * Check daily loss limit
   */
  private checkDailyLoss(userId: string, config: RiskControlConfig): RiskCheck {
    const state = this.userStates.get(userId)!;
    const dailyLossPercentage = Math.abs(state.dailyLoss); // Convert to positive for comparison

    const passed = dailyLossPercentage < config.maxDailyLoss;
    const severity = dailyLossPercentage > config.maxDailyLoss * 0.8 ? 'warning' : 'info';

    return {
      type: 'daily_loss',
      passed,
      reason: passed
        ? `Daily loss ${dailyLossPercentage.toFixed(2)}% is within limit`
        : `Daily loss ${dailyLossPercentage.toFixed(2)}% exceeds limit of ${config.maxDailyLoss}%`,
      currentValue: dailyLossPercentage,
      limitValue: config.maxDailyLoss,
      severity: passed ? severity : 'critical'
    };
  }

  /**
   * Check concurrent trades limit
   */
  private checkConcurrentTrades(userId: string, config: RiskControlConfig): RiskCheck {
    const state = this.userStates.get(userId)!;
    const passed = state.activeTrades < config.maxConcurrentTrades;
    const severity = state.activeTrades >= config.maxConcurrentTrades * 0.8 ? 'warning' : 'info';

    return {
      type: 'concurrent_trades',
      passed,
      reason: passed
        ? `Active trades ${state.activeTrades} is within limit`
        : `Active trades ${state.activeTrades} exceeds limit of ${config.maxConcurrentTrades}`,
      currentValue: state.activeTrades,
      limitValue: config.maxConcurrentTrades,
      severity: passed ? severity : 'critical'
    };
  }

  /**
   * Check cooldown period after losses
   */
  private checkCooldownPeriod(userId: string, config: RiskControlConfig): RiskCheck {
    const state = this.userStates.get(userId)!;

    if (!state.lastLossTimestamp || state.dailyLoss >= 0) {
      // No recent loss or currently profitable
      return {
        type: 'cooldown',
        passed: true,
        reason: 'No cooldown required',
        severity: 'info'
      };
    }

    const timeSinceLastLoss = Date.now() - state.lastLossTimestamp.getTime();
    const cooldownMs = config.cooldownPeriod * 1000;
    const passed = timeSinceLastLoss >= cooldownMs;

    const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastLoss) / 1000);

    return {
      type: 'cooldown',
      passed,
      reason: passed
        ? 'Cooldown period completed'
        : `Cooldown period active: ${remainingSeconds}s remaining`,
      currentValue: timeSinceLastLoss / 1000,
      limitValue: config.cooldownPeriod,
      severity: passed ? 'info' : 'warning'
    };
  }

  /**
   * Check max loss per trade
   */
  private checkMaxLossPerTrade(
    tradeSize: number,
    portfolioValue: number,
    config: RiskControlConfig
  ): RiskCheck {
    const maxLossValue = portfolioValue * (config.maxLossPerTrade / 100);
    const potentialLossPercentage = (tradeSize / portfolioValue) * 100;

    // Assume worst case: entire trade size could be lost
    const passed = tradeSize <= maxLossValue;
    const severity = potentialLossPercentage > config.maxLossPerTrade * 0.8 ? 'warning' : 'info';

    return {
      type: 'max_loss_per_trade',
      passed,
      reason: passed
        ? `Potential loss ${potentialLossPercentage.toFixed(2)}% is within limit`
        : `Potential loss ${potentialLossPercentage.toFixed(2)}% exceeds limit of ${config.maxLossPerTrade}%`,
      currentValue: potentialLossPercentage,
      limitValue: config.maxLossPerTrade,
      severity: passed ? severity : 'critical'
    };
  }

  /**
   * Record trade result and update risk state
   */
  async recordTradeResult(result: TradeResult): Promise<void> {
    this.logger.info(
      `Recording trade result for user ${result.userId}: ` +
      `P&L ${result.profitLoss} (${result.profitLossPercentage.toFixed(2)}%)`
    );

    this.ensureUserState(result.userId);
    const state = this.userStates.get(result.userId)!;

    // Update daily loss (negative P&L increases loss)
    if (result.profitLoss < 0) {
      state.dailyLoss += Math.abs(result.profitLossPercentage);
      state.lastLossTimestamp = result.timestamp;
      
      this.logger.warn(
        `User ${result.userId} daily loss updated to ${state.dailyLoss.toFixed(2)}%`
      );
    } else {
      // Profit reduces daily loss (but doesn't go negative)
      state.dailyLoss = Math.max(0, state.dailyLoss - result.profitLossPercentage);
      
      this.logger.info(
        `User ${result.userId} daily loss reduced to ${state.dailyLoss.toFixed(2)}%`
      );
    }

    // Decrement active trades
    state.activeTrades = Math.max(0, state.activeTrades - 1);
  }

  /**
   * Increment active trades count
   */
  incrementActiveTrades(userId: string): void {
    this.ensureUserState(userId);
    const state = this.userStates.get(userId)!;
    state.activeTrades++;
    
    this.logger.info(`User ${userId} active trades: ${state.activeTrades}`);
  }

  /**
   * Decrement active trades count
   */
  decrementActiveTrades(userId: string): void {
    this.ensureUserState(userId);
    const state = this.userStates.get(userId)!;
    state.activeTrades = Math.max(0, state.activeTrades - 1);
    
    this.logger.info(`User ${userId} active trades: ${state.activeTrades}`);
  }

  /**
   * Get current risk state for user
   */
  getUserRiskState(userId: string): UserRiskState {
    this.ensureUserState(userId);
    return { ...this.userStates.get(userId)! };
  }

  /**
   * Reset daily loss for user (called at day boundary)
   */
  resetDailyLoss(userId: string): void {
    this.ensureUserState(userId);
    const state = this.userStates.get(userId)!;
    
    this.logger.info(
      `Resetting daily loss for user ${userId} (was ${state.dailyLoss.toFixed(2)}%)`
    );
    
    state.dailyLoss = 0;
    state.lastResetDate = this.getDateKey(new Date());
  }

  /**
   * Reset all users' daily loss (called at day boundary)
   */
  resetAllDailyLoss(): void {
    const today = this.getDateKey(new Date());
    let resetCount = 0;

    for (const [userId, state] of this.userStates.entries()) {
      if (state.lastResetDate !== today) {
        state.dailyLoss = 0;
        state.lastResetDate = today;
        resetCount++;
      }
    }

    this.logger.info(`Reset daily loss for ${resetCount} users`);
  }

  /**
   * Ensure user state exists and is current
   */
  private ensureUserState(userId: string): void {
    const today = this.getDateKey(new Date());

    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        dailyLoss: 0,
        activeTrades: 0,
        lastResetDate: today
      });
    } else {
      const state = this.userStates.get(userId)!;
      
      // Reset daily loss if it's a new day
      if (state.lastResetDate !== today) {
        this.logger.info(`New day detected for user ${userId}, resetting daily loss`);
        state.dailyLoss = 0;
        state.lastResetDate = today;
      }
    }
  }

  /**
   * Get date key for tracking daily resets
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Clear all user states (for testing)
   */
  clearAllStates(): void {
    this.userStates.clear();
    this.logger.info('Cleared all user risk states');
  }

  /**
   * Get statistics about current risk states
   */
  getStatistics(): {
    totalUsers: number;
    usersWithActiveTrades: number;
    usersInCooldown: number;
    usersNearDailyLimit: number;
    totalActiveTrades: number;
  } {
    let usersWithActiveTrades = 0;
    let usersInCooldown = 0;
    let usersNearDailyLimit = 0;
    let totalActiveTrades = 0;

    for (const state of this.userStates.values()) {
      if (state.activeTrades > 0) {
        usersWithActiveTrades++;
        totalActiveTrades += state.activeTrades;
      }
      
      if (state.lastLossTimestamp) {
        const timeSinceLastLoss = Date.now() - state.lastLossTimestamp.getTime();
        if (timeSinceLastLoss < 300000) { // 5 minutes
          usersInCooldown++;
        }
      }
      
      if (state.dailyLoss > 8) { // Near 10% limit
        usersNearDailyLimit++;
      }
    }

    return {
      totalUsers: this.userStates.size,
      usersWithActiveTrades,
      usersInCooldown,
      usersNearDailyLimit,
      totalActiveTrades
    };
  }
}
