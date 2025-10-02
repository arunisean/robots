import { z } from 'zod';

// 用户相关类型

// 用户接口
export interface User {
  id: string;
  walletAddress: string;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
  subscription: SubscriptionInfo;
  profile: UserProfile;
}

// 用户偏好
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
  privacy: PrivacyPreferences;
}

// 通知偏好
export interface NotificationPreferences {
  email: boolean;
  browser: boolean;
  slack: boolean;
  agentAlerts: boolean;
  performanceReports: boolean;
  securityAlerts: boolean;
  systemUpdates: boolean;
}

// 仪表板偏好
export interface DashboardPreferences {
  layout: 'grid' | 'list' | 'cards';
  defaultView: 'agents' | 'workflows' | 'analytics';
  refreshInterval: number; // seconds
  showMetrics: boolean;
  compactMode: boolean;
}

// 隐私偏好
export interface PrivacyPreferences {
  shareUsageData: boolean;
  allowAnalytics: boolean;
  publicProfile: boolean;
  shareAgents: boolean;
}

// 订阅信息
export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  features: string[];
  limits: SubscriptionLimits;
  billing: BillingInfo;
}

// 订阅计划
export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// 订阅状态
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  TRIAL = 'trial'
}

// 订阅限制
export interface SubscriptionLimits {
  maxAgents: number;
  maxWorkflows: number;
  maxExecutionsPerMonth: number;
  maxStorageGB: number;
  maxApiCalls: number;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

// 账单信息
export interface BillingInfo {
  paymentMethod: 'crypto' | 'card' | 'bank';
  walletAddress?: string;
  lastPayment?: Date;
  nextPayment?: Date;
  amount: number;
  currency: string;
}

// 用户资料
export interface UserProfile {
  displayName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  company?: string;
  socialLinks: SocialLinks;
  stats: UserStats;
}

// 社交链接
export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  discord?: string;
}

// 用户统计
export interface UserStats {
  totalAgents: number;
  totalWorkflows: number;
  totalExecutions: number;
  successRate: number;
  joinedAt: Date;
  lastActive: Date;
  reputation: number;
  contributions: number;
}

// 认证结果
export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

// 钱包类型
export enum WalletType {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'wallet_connect',
  COINBASE = 'coinbase',
  PHANTOM = 'phantom'
}

// 会话信息
export interface Session {
  id: string;
  userId: string;
  walletAddress: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  active: boolean;
}

// 用户活动
export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

// 活动类型
export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  AGENT_CREATED = 'agent_created',
  AGENT_UPDATED = 'agent_updated',
  AGENT_DELETED = 'agent_deleted',
  WORKFLOW_CREATED = 'workflow_created',
  WORKFLOW_EXECUTED = 'workflow_executed',
  SETTINGS_UPDATED = 'settings_updated',
  SUBSCRIPTION_CHANGED = 'subscription_changed'
}

// API密钥
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  active: boolean;
}

// Zod验证模式
export const UserSchema = z.object({
  id: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  createdAt: z.date(),
  lastLoginAt: z.date(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.string(),
    timezone: z.string(),
    notifications: z.object({
      email: z.boolean(),
      browser: z.boolean(),
      slack: z.boolean(),
      agentAlerts: z.boolean(),
      performanceReports: z.boolean(),
      securityAlerts: z.boolean(),
      systemUpdates: z.boolean(),
    }),
    dashboard: z.object({
      layout: z.enum(['grid', 'list', 'cards']),
      defaultView: z.enum(['agents', 'workflows', 'analytics']),
      refreshInterval: z.number().min(5).max(300),
      showMetrics: z.boolean(),
      compactMode: z.boolean(),
    }),
    privacy: z.object({
      shareUsageData: z.boolean(),
      allowAnalytics: z.boolean(),
      publicProfile: z.boolean(),
      shareAgents: z.boolean(),
    }),
  }),
  subscription: z.object({
    plan: z.nativeEnum(SubscriptionPlan),
    status: z.nativeEnum(SubscriptionStatus),
    startDate: z.date(),
    endDate: z.date().optional(),
    features: z.array(z.string()),
    limits: z.object({
      maxAgents: z.number(),
      maxWorkflows: z.number(),
      maxExecutionsPerMonth: z.number(),
      maxStorageGB: z.number(),
      maxApiCalls: z.number(),
      supportLevel: z.enum(['community', 'email', 'priority', 'dedicated']),
    }),
    billing: z.object({
      paymentMethod: z.enum(['crypto', 'card', 'bank']),
      walletAddress: z.string().optional(),
      lastPayment: z.date().optional(),
      nextPayment: z.date().optional(),
      amount: z.number(),
      currency: z.string(),
    }),
  }),
  profile: z.object({
    displayName: z.string().optional(),
    avatar: z.string().optional(),
    bio: z.string().optional(),
    website: z.string().optional(),
    location: z.string().optional(),
    company: z.string().optional(),
    socialLinks: z.object({
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
      discord: z.string().optional(),
    }),
    stats: z.object({
      totalAgents: z.number(),
      totalWorkflows: z.number(),
      totalExecutions: z.number(),
      successRate: z.number(),
      joinedAt: z.date(),
      lastActive: z.date(),
      reputation: z.number(),
      contributions: z.number(),
    }),
  }),
});

export const AuthResultSchema = z.object({
  success: z.boolean(),
  user: UserSchema.optional(),
  token: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  error: z.string().optional(),
});