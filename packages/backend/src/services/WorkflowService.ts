import { EventEmitter } from 'events';
import {
  Workflow,
  WorkflowStatus,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilters,
  WorkflowValidationResult,
  WorkflowValidationError
} from '@multi-agent-platform/shared';
import { WorkflowRepository } from '../database/repositories';
import { Logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error-handler';

/**
 * Service for managing workflows
 * Handles CRUD operations, validation, and business logic
 */
export class WorkflowService extends EventEmitter {
  private workflowRepo: WorkflowRepository;
  private logger: Logger;

  constructor(workflowRepo: WorkflowRepository) {
    super();
    this.workflowRepo = workflowRepo;
    this.logger = new Logger('WorkflowService');
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(data: CreateWorkflowDto, userId: string): Promise<Workflow> {
    this.logger.info(`Creating workflow: ${data.name} for user ${userId}`);

    try {
      // Validate workflow definition
      const validation = await this.validateWorkflowDefinition(data.definition);
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Create workflow
      const workflow = await this.workflowRepo.create(data, userId);

      this.emit('workflowCreated', { workflow, userId });
      this.logger.info(`Workflow created: ${workflow.id}`);

      return workflow;
    } catch (error) {
      this.logger.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string, userId: string): Promise<Workflow> {
    this.logger.debug(`Getting workflow: ${workflowId}`);

    try {
      const workflow = await this.workflowRepo.findById(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Check ownership
      if (workflow.ownerId !== userId) {
        throw new Error('Access denied: You do not own this workflow');
      }

      return workflow;
    } catch (error) {
      this.logger.error(`Failed to get workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * List workflows for a user
   */
  async listWorkflows(userId: string, filters?: WorkflowFilters): Promise<{
    workflows: Workflow[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    this.logger.debug(`Listing workflows for user ${userId}`);

    try {
      const workflows = await this.workflowRepo.findByOwner(userId, filters);
      const total = await this.workflowRepo.countByOwner(userId, filters);

      const page = filters?.offset ? Math.floor(filters.offset / (filters.limit || 10)) + 1 : 1;
      const pageSize = filters?.limit || 10;

      return {
        workflows,
        total,
        page,
        pageSize
      };
    } catch (error) {
      this.logger.error('Failed to list workflows:', error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    workflowId: string, 
    data: UpdateWorkflowDto, 
    userId: string
  ): Promise<Workflow> {
    this.logger.info(`Updating workflow: ${workflowId}`);

    try {
      // Check ownership
      const isOwner = await this.workflowRepo.isOwner(workflowId, userId);
      if (!isOwner) {
        throw new Error('Access denied: You do not own this workflow');
      }

      // If updating definition, validate it
      if (data.definition) {
        const validation = await this.validateWorkflowDefinition(data.definition);
        if (!validation.isValid) {
          throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Update workflow
      const workflow = await this.workflowRepo.update(workflowId, data);

      this.emit('workflowUpdated', { workflow, userId });
      this.logger.info(`Workflow updated: ${workflowId}`);

      return workflow;
    } catch (error) {
      this.logger.error(`Failed to update workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string, userId: string): Promise<void> {
    this.logger.info(`Deleting workflow: ${workflowId}`);

    try {
      // Check ownership
      const isOwner = await this.workflowRepo.isOwner(workflowId, userId);
      if (!isOwner) {
        throw new Error('Access denied: You do not own this workflow');
      }

      // Get workflow to check status
      const workflow = await this.workflowRepo.findById(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Don't allow deleting active workflows
      if (workflow.status === 'active') {
        throw new Error('Cannot delete active workflow. Please pause it first.');
      }

      // Delete workflow
      await this.workflowRepo.delete(workflowId);

      this.emit('workflowDeleted', { workflowId, userId });
      this.logger.info(`Workflow deleted: ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to delete workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    workflowId: string, 
    status: WorkflowStatus, 
    userId: string
  ): Promise<Workflow> {
    this.logger.info(`Updating workflow status: ${workflowId} to ${status}`);

    try {
      // Check ownership
      const isOwner = await this.workflowRepo.isOwner(workflowId, userId);
      if (!isOwner) {
        throw new Error('Access denied: You do not own this workflow');
      }

      // Validate status transition
      const workflow = await this.workflowRepo.findById(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      this.validateStatusTransition(workflow.status, status);

      // Update status
      const updatedWorkflow = await this.workflowRepo.update(workflowId, { status });

      this.emit('workflowStatusChanged', { 
        workflow: updatedWorkflow, 
        oldStatus: workflow.status, 
        newStatus: status, 
        userId 
      });

      this.logger.info(`Workflow status updated: ${workflowId} from ${workflow.status} to ${status}`);

      return updatedWorkflow;
    } catch (error) {
      this.logger.error(`Failed to update workflow status ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string, userId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    lastExecuted?: Date;
  }> {
    this.logger.debug(`Getting workflow stats: ${workflowId}`);

    try {
      // Check ownership
      const isOwner = await this.workflowRepo.isOwner(workflowId, userId);
      if (!isOwner) {
        throw new Error('Access denied: You do not own this workflow');
      }

      const stats = await this.workflowRepo.getStats(workflowId);
      const successRate = stats.totalExecutions > 0 
        ? (stats.successfulExecutions / stats.totalExecutions) * 100 
        : 0;

      return {
        ...stats,
        successRate: Math.round(successRate * 100) / 100
      };
    } catch (error) {
      this.logger.error(`Failed to get workflow stats ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Duplicate workflow
   */
  async duplicateWorkflow(workflowId: string, userId: string): Promise<Workflow> {
    this.logger.info(`Duplicating workflow: ${workflowId}`);

    try {
      // Check ownership
      const isOwner = await this.workflowRepo.isOwner(workflowId, userId);
      if (!isOwner) {
        throw new Error('Access denied: You do not own this workflow');
      }

      // Get original workflow
      const original = await this.workflowRepo.findById(workflowId);
      if (!original) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create duplicate
      const duplicateData: CreateWorkflowDto = {
        name: `${original.name} (Copy)`,
        description: original.description,
        version: '1.0.0',
        definition: original.definition,
        settings: original.settings,
        metadata: {
          ...original.metadata,
          originalWorkflowId: workflowId,
          duplicatedAt: new Date()
        }
      };

      const duplicate = await this.createWorkflow(duplicateData, userId);

      this.emit('workflowDuplicated', { original, duplicate, userId });
      this.logger.info(`Workflow duplicated: ${workflowId} -> ${duplicate.id}`);

      return duplicate;
    } catch (error) {
      this.logger.error(`Failed to duplicate workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Validate workflow definition
   */
  async validateWorkflowDefinition(definition: any): Promise<WorkflowValidationResult> {
    const errors: WorkflowValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Check if definition has nodes
      if (!definition.nodes || !Array.isArray(definition.nodes)) {
        errors.push({
          type: 'invalid_config',
          message: 'Workflow must have a nodes array',
          field: 'nodes'
        });
        return { isValid: false, errors, warnings };
      }

      if (definition.nodes.length === 0) {
        errors.push({
          type: 'invalid_config',
          message: 'Workflow must have at least one agent',
          field: 'nodes'
        });
        return { isValid: false, errors, warnings };
      }

      // Check if definition has connections
      if (!definition.connections || !Array.isArray(definition.connections)) {
        errors.push({
          type: 'invalid_config',
          message: 'Workflow must have a connections array',
          field: 'connections'
        });
        return { isValid: false, errors, warnings };
      }

      // Validate each node
      const nodeIds = new Set<string>();
      for (const node of definition.nodes) {
        // Check required fields
        if (!node.id) {
          errors.push({
            type: 'invalid_config',
            message: 'Agent node must have an id',
            field: 'nodes'
          });
          continue;
        }

        // Check for duplicate IDs
        if (nodeIds.has(node.id)) {
          errors.push({
            type: 'invalid_config',
            message: `Duplicate agent ID: ${node.id}`,
            agentId: node.id
          });
        }
        nodeIds.add(node.id);

        // Check required fields
        if (!node.type) {
          errors.push({
            type: 'invalid_config',
            message: `Agent ${node.id} must have a type`,
            agentId: node.id,
            field: 'type'
          });
        }

        if (!node.category) {
          errors.push({
            type: 'invalid_config',
            message: `Agent ${node.id} must have a category`,
            agentId: node.id,
            field: 'category'
          });
        }

        if (!node.config) {
          errors.push({
            type: 'invalid_config',
            message: `Agent ${node.id} must have a config`,
            agentId: node.id,
            field: 'config'
          });
        }
      }

      // Validate connections
      for (const connection of definition.connections) {
        if (!connection.from || !connection.to) {
          errors.push({
            type: 'invalid_connection',
            message: 'Connection must have from and to fields'
          });
          continue;
        }

        // Check if nodes exist
        if (!nodeIds.has(connection.from)) {
          errors.push({
            type: 'missing_agent',
            message: `Connection references non-existent agent: ${connection.from}`,
            agentId: connection.from
          });
        }

        if (!nodeIds.has(connection.to)) {
          errors.push({
            type: 'missing_agent',
            message: `Connection references non-existent agent: ${connection.to}`,
            agentId: connection.to
          });
        }
      }

      // Check for circular dependencies
      const circularCheck = this.detectCircularDependencies(definition.nodes, definition.connections);
      if (circularCheck.hasCircular) {
        errors.push({
          type: 'circular_dependency',
          message: `Circular dependency detected: ${circularCheck.cycle?.join(' -> ')}`
        });
      }

      // Check for disconnected nodes
      const connectedNodes = new Set<string>();
      for (const connection of definition.connections) {
        connectedNodes.add(connection.from);
        connectedNodes.add(connection.to);
      }

      for (const nodeId of nodeIds) {
        if (!connectedNodes.has(nodeId) && definition.nodes.length > 1) {
          warnings.push(`Agent ${nodeId} is not connected to any other agents`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error('Workflow validation error:', error);
      errors.push({
        type: 'invalid_config',
        message: `Validation error: ${getErrorMessage(error)}`
      });
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Detect circular dependencies in workflow
   */
  private detectCircularDependencies(
    nodes: any[], 
    connections: any[]
  ): { hasCircular: boolean; cycle?: string[] } {
    // Build adjacency list
    const graph = new Map<string, string[]>();
    for (const node of nodes) {
      graph.set(node.id, []);
    }
    for (const connection of connections) {
      const neighbors = graph.get(connection.from) || [];
      neighbors.push(connection.to);
      graph.set(connection.from, neighbors);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          path.push(neighbor);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };

    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) {
          return { hasCircular: true, cycle: [...path] };
        }
      }
    }

    return { hasCircular: false };
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: WorkflowStatus, newStatus: WorkflowStatus): void {
    const validTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
      draft: ['active', 'archived'],
      active: ['paused', 'archived'],
      paused: ['active', 'archived'],
      archived: ['draft']
    };

    const allowed = validTransitions[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }
}
