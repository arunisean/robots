import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';

declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseService;
    redis: RedisService | null;
  }
}

// 重新导出pg的QueryResult类型
export { QueryResult } from 'pg';

// 用户相关类型
export interface User {
  id: string;
  wallet_address: string;
  preferences: any;
  profile: any;
  subscription?: any;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  walletAddress: string;
  preferences?: any;
  profile?: any;
}

// Agent相关类型
export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  config: any;
  metadata: any;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAgentData {
  name: string;
  description: string;
  category: string;
  version: string;
  config: any;
  metadata: any;
  ownerId: string;
}

// 工作流相关类型
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  definition: any;
  settings: any;
  metadata: any;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWorkflowData {
  name: string;
  description: string;
  version: string;
  definition: any;
  settings: any;
  metadata: any;
  ownerId: string;
}

// 执行记录相关类型
export interface ExecutionRecord {
  id: string;
  workflow_id: string;
  agent_id: string;
  status: string;
  start_time: Date;
  end_time?: Date;
  input_data: any;
  output_data?: any;
  error_message?: string;
  metrics: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExecutionRecordData {
  workflowId: string;
  agentId: string;
  status: string;
  startTime: Date;
  inputData: any;
  metrics: any;
}

export interface ExecutionRecordFilters {
  agentId?: string;
  workflowId?: string;
  status?: string;
  limit?: number;
}

// 会话相关类型
export interface Session {
  id: string;
  user_id: string;
  wallet_address: string;
  token_hash: string;
  expires_at: Date;
  ip_address: string;
  user_agent: string;
  active: boolean;
  last_activity: Date;
  created_at: Date;
}

export interface CreateSessionData {
  userId: string;
  walletAddress: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface SessionWithUser extends Session {
  preferences: any;
  profile: any;
}