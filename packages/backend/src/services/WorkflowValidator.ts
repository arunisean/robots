import {
  WorkflowDefinition,
  WorkflowAgent,
  WorkflowConnection,
  WorkflowValidationResult,
  WorkflowValidationError,
  DataFlowValidationResult,
  AgentCategory
} from '@multi-agent-platform/shared';
import { Logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error-handler';

/**
 * Validator for workflow definitions and agent connections
 */
export class WorkflowValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('WorkflowValidator');
  }

  /**
   * Validate complete workflow definition
   */
  validate(definition: WorkflowDefinition): WorkflowValidationResult {
    const errors: WorkflowValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Validate structure
      this.validateStructure(definition, errors);
      
      // Validate nodes
      this.validateNodes(definition.nodes, errors, warnings);
      
      // Validate connections
      this.validateConnections(definition.nodes, definition.connections, errors);
      
      // Check for circular dependencies
      this.checkCircularDependencies(definition.nodes, definition.connections, errors);
      
      // Validate agent order (Work → Process → Publish → Validate)
      this.validateAgentOrder(definition.nodes, definition.connections, errors, warnings);
      
      // Check for disconnected nodes
      this.checkDisconnectedNodes(definition.nodes, definition.connections, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error('Validation error:', error);
      errors.push({
        type: 'invalid_config',
        message: `Validation error: ${getErrorMessage(error)}`
      });
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validate workflow structure
   */
  private validateStructure(definition: WorkflowDefinition, errors: WorkflowValidationError[]): void {
    if (!definition.nodes || !Array.isArray(definition.nodes)) {
      errors.push({
        type: 'invalid_config',
        message: 'Workflow must have a nodes array',
        field: 'nodes'
      });
    }

    if (!definition.connections || !Array.isArray(definition.connections)) {
      errors.push({
        type: 'invalid_config',
        message: 'Workflow must have a connections array',
        field: 'connections'
      });
    }

    if (definition.nodes && definition.nodes.length === 0) {
      errors.push({
        type: 'invalid_config',
        message: 'Workflow must have at least one agent',
        field: 'nodes'
      });
    }
  }

  /**
   * Validate workflow nodes
   */
  private validateNodes(
    nodes: WorkflowAgent[], 
    errors: WorkflowValidationError[], 
    warnings: string[]
  ): void {
    const nodeIds = new Set<string>();

    for (const node of nodes) {
      // Check required fields
      if (!node.id) {
        errors.push({
          type: 'invalid_config',
          message: 'Agent node must have an id',
          field: 'id'
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

      // Validate agent type
      if (!node.agentType) {
        errors.push({
          type: 'invalid_config',
          message: `Agent ${node.id} must have a type`,
          agentId: node.id,
          field: 'agentType'
        });
      }

      // Validate agent category
      if (!node.agentCategory) {
        errors.push({
          type: 'invalid_config',
          message: `Agent ${node.id} must have a category`,
          agentId: node.id,
          field: 'agentCategory'
        });
      } else if (!this.isValidCategory(node.agentCategory)) {
        errors.push({
          type: 'invalid_config',
          message: `Agent ${node.id} has invalid category: ${node.agentCategory}`,
          agentId: node.id,
          field: 'agentCategory'
        });
      }

      // Validate config
      if (!node.config) {
        errors.push({
          type: 'invalid_config',
          message: `Agent ${node.id} must have a config`,
          agentId: node.id,
          field: 'config'
        });
      } else {
        this.validateAgentConfig(node, errors);
      }

      // Validate order
      if (node.order === undefined || node.order === null) {
        warnings.push(`Agent ${node.id} does not have an order specified`);
      }
    }
  }

  /**
   * Validate agent configuration
   */
  private validateAgentConfig(node: WorkflowAgent, errors: WorkflowValidationError[]): void {
    const config = node.config;

    // Check required config fields
    if (!config.id) {
      errors.push({
        type: 'invalid_config',
        message: `Agent ${node.id} config must have an id`,
        agentId: node.id,
        field: 'config.id'
      });
    }

    if (!config.name) {
      errors.push({
        type: 'invalid_config',
        message: `Agent ${node.id} config must have a name`,
        agentId: node.id,
        field: 'config.name'
      });
    }

    if (!config.category) {
      errors.push({
        type: 'invalid_config',
        message: `Agent ${node.id} config must have a category`,
        agentId: node.id,
        field: 'config.category'
      });
    }

    // Category-specific validation
    switch (node.agentCategory) {
      case AgentCategory.WORK:
        this.validateWorkAgentConfig(node, errors);
        break;
      case AgentCategory.PROCESS:
        this.validateProcessAgentConfig(node, errors);
        break;
      case AgentCategory.PUBLISH:
        this.validatePublishAgentConfig(node, errors);
        break;
      case AgentCategory.VALIDATE:
        this.validateValidateAgentConfig(node, errors);
        break;
    }
  }

  /**
   * Validate Work agent config
   */
  private validateWorkAgentConfig(node: WorkflowAgent, errors: WorkflowValidationError[]): void {
    const config = node.config as any;
    
    if (!config.dataSources || !Array.isArray(config.dataSources) || config.dataSources.length === 0) {
      errors.push({
        type: 'invalid_config',
        message: `Work agent ${node.id} must have at least one data source`,
        agentId: node.id,
        field: 'config.dataSources'
      });
    }
  }

  /**
   * Validate Process agent config
   */
  private validateProcessAgentConfig(node: WorkflowAgent, errors: WorkflowValidationError[]): void {
    const config = node.config as any;
    
    if (!config.processingRules || !Array.isArray(config.processingRules) || config.processingRules.length === 0) {
      errors.push({
        type: 'invalid_config',
        message: `Process agent ${node.id} must have at least one processing rule`,
        agentId: node.id,
        field: 'config.processingRules'
      });
    }
  }

  /**
   * Validate Publish agent config
   */
  private validatePublishAgentConfig(node: WorkflowAgent, errors: WorkflowValidationError[]): void {
    const config = node.config as any;
    
    if (!config.publishTargets || !Array.isArray(config.publishTargets) || config.publishTargets.length === 0) {
      errors.push({
        type: 'invalid_config',
        message: `Publish agent ${node.id} must have at least one publish target`,
        agentId: node.id,
        field: 'config.publishTargets'
      });
    }
  }

  /**
   * Validate Validate agent config
   */
  private validateValidateAgentConfig(node: WorkflowAgent, errors: WorkflowValidationError[]): void {
    const config = node.config as any;
    
    if (!config.validationRules || !Array.isArray(config.validationRules) || config.validationRules.length === 0) {
      errors.push({
        type: 'invalid_config',
        message: `Validate agent ${node.id} must have at least one validation rule`,
        agentId: node.id,
        field: 'config.validationRules'
      });
    }
  }

  /**
   * Validate connections
   */
  private validateConnections(
    nodes: WorkflowAgent[], 
    connections: WorkflowConnection[], 
    errors: WorkflowValidationError[]
  ): void {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const connection of connections) {
      // Check required fields
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
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(
    nodes: WorkflowAgent[], 
    connections: WorkflowConnection[], 
    errors: WorkflowValidationError[]
  ): void {
    const result = this.detectCircularDependencies(nodes, connections);
    if (result.hasCircular) {
      errors.push({
        type: 'circular_dependency',
        message: `Circular dependency detected: ${result.cycle?.join(' → ')}`
      });
    }
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(
    nodes: WorkflowAgent[], 
    connections: WorkflowConnection[]
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
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor);
          path.length = 0;
          path.push(...cycle);
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
   * Validate agent order (Work → Process → Publish → Validate)
   */
  private validateAgentOrder(
    nodes: WorkflowAgent[], 
    connections: WorkflowConnection[], 
    errors: WorkflowValidationError[],
    warnings: string[]
  ): void {
    const categoryOrder: AgentCategory[] = [AgentCategory.WORK, AgentCategory.PROCESS, AgentCategory.PUBLISH, AgentCategory.VALIDATE];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const connection of connections) {
      const fromNode = nodeMap.get(connection.from);
      const toNode = nodeMap.get(connection.to);

      if (!fromNode || !toNode) continue;

      const fromIndex = categoryOrder.indexOf(fromNode.agentCategory);
      const toIndex = categoryOrder.indexOf(toNode.agentCategory);

      // Check if connection goes backwards in the pipeline
      if (fromIndex > toIndex) {
        warnings.push(
          `Connection from ${fromNode.agentCategory} (${connection.from}) to ${toNode.agentCategory} (${connection.to}) goes backwards in the recommended pipeline order`
        );
      }
    }
  }

  /**
   * Check for disconnected nodes
   */
  private checkDisconnectedNodes(
    nodes: WorkflowAgent[], 
    connections: WorkflowConnection[], 
    warnings: string[]
  ): void {
    if (nodes.length <= 1) return;

    const connectedNodes = new Set<string>();
    for (const connection of connections) {
      connectedNodes.add(connection.from);
      connectedNodes.add(connection.to);
    }

    for (const node of nodes) {
      if (!connectedNodes.has(node.id)) {
        warnings.push(`Agent ${node.id} is not connected to any other agents`);
      }
    }
  }

  /**
   * Validate data flow between two agents
   */
  validateDataFlow(
    sourceAgent: WorkflowAgent, 
    targetAgent: WorkflowAgent
  ): DataFlowValidationResult {
    const errors: string[] = [];
    let transformationRequired = false;

    // Get output type of source agent
    const sourceOutputType = this.getAgentOutputType(sourceAgent.agentCategory);
    
    // Get input type of target agent
    const targetInputType = this.getAgentInputType(targetAgent.agentCategory);

    // Check compatibility
    const compatible = this.areTypesCompatible(sourceOutputType, targetInputType);

    if (!compatible) {
      transformationRequired = true;
      errors.push(
        `Data type mismatch: ${sourceAgent.agentCategory} outputs ${sourceOutputType}, ` +
        `but ${targetAgent.agentCategory} expects ${targetInputType}`
      );
    }

    return {
      compatible,
      sourceAgent: sourceAgent.id,
      targetAgent: targetAgent.id,
      sourceOutputType,
      targetInputType,
      transformationRequired,
      errors
    };
  }

  /**
   * Get agent output type based on category
   */
  private getAgentOutputType(category: AgentCategory): string {
    switch (category) {
      case AgentCategory.WORK:
        return 'CollectedData';
      case AgentCategory.PROCESS:
        return 'ProcessedData';
      case AgentCategory.PUBLISH:
        return 'PublishResult';
      case AgentCategory.VALIDATE:
        return 'ValidationResult';
      default:
        return 'unknown';
    }
  }

  /**
   * Get agent input type based on category
   */
  private getAgentInputType(category: AgentCategory): string {
    switch (category) {
      case AgentCategory.WORK:
        return 'any'; // Work agents typically don't need input
      case AgentCategory.PROCESS:
        return 'CollectedData';
      case AgentCategory.PUBLISH:
        return 'ProcessedData';
      case AgentCategory.VALIDATE:
        return 'PublishResult';
      default:
        return 'unknown';
    }
  }

  /**
   * Check if two types are compatible
   */
  private areTypesCompatible(sourceType: string, targetType: string): boolean {
    // 'any' type accepts anything
    if (targetType === 'any') return true;
    
    // Exact match
    if (sourceType === targetType) return true;
    
    // Check if transformation is possible
    const compatibilityMap: Record<string, string[]> = {
      'CollectedData': ['ProcessedData', 'PublishResult'],
      'ProcessedData': ['PublishResult', 'ValidationResult'],
      'PublishResult': ['ValidationResult']
    };

    const compatibleTypes = compatibilityMap[sourceType] || [];
    return compatibleTypes.includes(targetType);
  }

  /**
   * Check if category is valid
   */
  private isValidCategory(category: string): boolean {
    const validCategories: AgentCategory[] = [AgentCategory.WORK, AgentCategory.PROCESS, AgentCategory.PUBLISH, AgentCategory.VALIDATE];
    return validCategories.includes(category as AgentCategory);
  }
}
