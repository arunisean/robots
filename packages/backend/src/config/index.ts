import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  // 服务器配置
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  
  // 数据库配置
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/multi_agent_platform',
  
  // Redis配置
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS配置
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // 日志配置
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Web3配置
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-infura-project-id',
  
  // LLM服务配置
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  
  // 社交平台API配置
  TWITTER_API_KEY: process.env.TWITTER_API_KEY,
  TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
  TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
  
  // 对象存储配置
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  
  // Agent配置
  AGENT_EXECUTION_TIMEOUT: parseInt(process.env.AGENT_EXECUTION_TIMEOUT || '300000', 10), // 5 minutes
  MAX_CONCURRENT_AGENTS: parseInt(process.env.MAX_CONCURRENT_AGENTS || '10', 10),
  
  // 工作流配置
  WORKFLOW_EXECUTION_TIMEOUT: parseInt(process.env.WORKFLOW_EXECUTION_TIMEOUT || '1800000', 10), // 30 minutes
  MAX_CONCURRENT_WORKFLOWS: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '5', 10),
  
  // 文件上传配置
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  
  // 速率限制配置
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  
  // 缓存配置
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
  
  // 监控配置
  METRICS_ENABLED: process.env.METRICS_ENABLED === 'true',
  METRICS_PORT: parseInt(process.env.METRICS_PORT || '9090', 10),
  
  // 开发模式配置
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

// 验证必需的环境变量
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// 导出类型
export type Config = typeof config;