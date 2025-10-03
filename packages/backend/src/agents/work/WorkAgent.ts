import {
    AgentCategory,
    AgentConfig,
    AgentInput,
    AgentStatus,
    DataSourceType,
    DataSource,
    CollectedData,
    WorkAgentConfig,
    WorkAgentInput,
    WorkAgentOutput,
    CollectionSummary
} from '@multi-agent-platform/shared';
import { BaseAgent } from '../base/BaseAgent';
import { IWorkAgent } from './IWorkAgent';

/**
 * Abstract base class for Work Agents (data collection)
 * Implements common data collection patterns and workflows
 */
export abstract class WorkAgent extends BaseAgent implements IWorkAgent {
    protected dataSources: DataSource[] = [];
    protected collectionRules: any[] = [];

    constructor(id: string, name: string, version: string, description: string) {
        super(id, name, version, AgentCategory.WORK, description);
    }

    /**
     * Set data collection target
     */
    async setTarget(target: DataSource): Promise<void> {
        this.logger.info(`Setting collection target: ${target.name}`);

        // Validate data source
        if (!this.validateDataSource(target)) {
            throw new Error(`Invalid data source: ${target.name}`);
        }

        this.dataSources = [target];
        this.emit('targetSet', { agentId: this.id, target });
    }

    /**
     * Start data collection process
     */
    async startCollection(): Promise<void> {
        if (this.dataSources.length === 0) {
            throw new Error('No data sources configured');
        }

        this.logger.info(`Starting data collection for ${this.dataSources.length} sources`);
        this.status = AgentStatus.RUNNING;

        try {
            // Start collection for each data source
            for (const source of this.dataSources) {
                await this.testDataSourceConnection(source);
            }
            this.emit('collectionStarted', { agentId: this.id, sources: this.dataSources });
        } catch (error) {
            this.status = AgentStatus.ERROR;
            throw error;
        }
    }

    /**
     * Stop data collection process
     */
    async stopCollection(): Promise<void> {
        this.logger.info('Stopping data collection');

        try {
            // Stop collection logic here
            this.status = AgentStatus.ACTIVE;
            this.emit('collectionStopped', { agentId: this.id });
        } catch (error) {
            this.logger.error('Error stopping collection:', error);
            throw error;
        }
    }

    /**
     * Get collected data with optional filtering
     */
    async getCollectedData(filter?: any): Promise<CollectedData[]> {
        // Return collected data based on filter
        // This is a placeholder implementation
        return [];
    }

    /**
     * Get collection statistics
     */
    async getCollectionStats(): Promise<any> {
        return {
            totalCollected: 0,
            successfulCollections: 0,
            failedCollections: 0,
            averageCollectionTime: 0,
            dataSourceStats: []
        };
    }

    /**
     * Test connection to data source
     */
    async testConnection(source: DataSource): Promise<boolean> {
        try {
            await this.testDataSourceConnection(source);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Core execution logic for Work Agents
     */
    protected async doExecute(input: AgentInput): Promise<CollectedData[]> {
        const workInput = input as WorkAgentInput;
        const results: CollectedData[] = [];

        this.logger.info(`Processing ${workInput.targets.length} collection targets`);

        // Process each target
        for (const target of workInput.targets) {
            try {
                this.logger.debug(`Collecting from target: ${target.url}`);

                // Collect data from target
                const rawData = await this.collectFromTarget(target);

                // Clean and process data
                const cleanedData = await this.cleanData(rawData);

                // Apply deduplication
                const deduplicatedData = await this.deduplicateData([cleanedData]);

                results.push(...deduplicatedData);

                this.logger.debug(`Collected ${deduplicatedData.length} items from ${target.url}`);
            } catch (error) {
                this.logger.error(`Failed to collect from ${target.url}:`, error);
                // Continue with other targets
            }
        }

        return results;
    }

    /**
     * Post-execution processing for Work Agents
     */
    protected async postExecute(result: CollectedData[], input: AgentInput): Promise<WorkAgentOutput> {
        const baseOutput = await super.postExecute(result, input);

        const summary: CollectionSummary = {
            totalItems: result.length,
            newItems: result.filter(item => this.isNewItem(item)).length,
            duplicateItems: 0, // Will be calculated during deduplication
            errorItems: 0, // Will be tracked during collection
            totalSize: result.reduce((sum, item) => sum + (item.content?.length || 0), 0),
            processingTime: baseOutput.metrics.duration || 0,
            sources: [...new Set(result.map(item => item.sourceId))]
        };

        return {
            ...baseOutput,
            data: result,
            summary
        };
    }

    /**
     * Work Agent specific configuration validation
     */
    protected validateSpecificConfig(config: AgentConfig): string[] {
        const errors: string[] = [];
        const workConfig = config as WorkAgentConfig;

        if (!workConfig.dataSources || workConfig.dataSources.length === 0) {
            errors.push('At least one data source must be configured');
        }

        // Validate each data source
        workConfig.dataSources?.forEach((source, index) => {
            if (!source.url || !this.isValidUrl(source.url)) {
                errors.push(`Invalid URL for data source ${index + 1}`);
            }

            if (!Object.values(DataSourceType).includes(source.type as DataSourceType)) {
                errors.push(`Invalid data source type for source ${index + 1}`);
            }
        });

        return errors;
    }

    /**
     * Work Agent specific health check
     */
    protected async doHealthCheck(): Promise<boolean> {
        // Check if data sources are accessible
        for (const source of this.dataSources) {
            try {
                await this.testDataSourceConnection(source);
            } catch (error) {
                this.logger.warn(`Data source ${source.name} is not accessible:`, error);
                return false;
            }
        }

        return true;
    }

    // BaseAgent abstract methods implementation

    /**
     * Agent-specific initialization logic
     */
    protected async doInitialize(config: AgentConfig): Promise<void> {
        // Load data sources from configuration
        const workConfig = config as WorkAgentConfig;
        if (workConfig.dataSources) {
            this.dataSources = workConfig.dataSources;
        }

        // Load collection rules from configuration
        if (workConfig.collectionRules) {
            this.collectionRules = workConfig.collectionRules;
        }

        this.logger.info(`Work agent initialized with ${this.dataSources.length} data sources and ${this.collectionRules.length} rules`);
    }

    /**
     * Agent-specific cleanup logic
     */
    protected async doCleanup(): Promise<void> {
        // Clear any cached data
        this.dataSources = [];
        this.collectionRules = [];
        this.logger.info('Work agent cleanup completed');
    }

    // Abstract methods for subclasses to implement

    /**
     * Collect data from a specific target
     */
    protected abstract collectFromTarget(target: any): Promise<any>;

    /**
     * Clean and process raw collected data
     */
    protected abstract cleanData(data: any, rules?: any[]): Promise<CollectedData>;

    /**
     * Get collection type
     */
    protected abstract getCollectionType(): string;

    /**
     * Test data source connection
     */
    protected abstract testDataSourceConnection(source: DataSource): Promise<void>;

    // Helper methods

    /**
     * Validate data source configuration
     */
    private validateDataSource(source: DataSource): boolean {
        if (!source.url || !source.type || !source.name) {
            return false;
        }

        if (!this.isValidUrl(source.url)) {
            return false;
        }

        if (!Object.values(DataSourceType).includes(source.type as DataSourceType)) {
            return false;
        }

        return true;
    }

    /**
     * Check if URL is valid
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Deduplicate collected data
     */
    private async deduplicateData(data: CollectedData[]): Promise<CollectedData[]> {
        const seen = new Set<string>();
        const deduplicated: CollectedData[] = [];

        for (const item of data) {
            if (!seen.has(item.hash)) {
                seen.add(item.hash);
                deduplicated.push(item);
            }
        }

        this.logger.debug(`Deduplicated ${data.length - deduplicated.length} items`);
        return deduplicated;
    }

    /**
     * Check if item is new (not previously collected)
     */
    private isNewItem(item: CollectedData): boolean {
        // This would typically check against a database or cache
        // For now, assume all items are new
        return true;
    }
}