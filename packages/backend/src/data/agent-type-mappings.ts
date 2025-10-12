/**
 * Agent Type到Implementation Class的映射关系
 * 用于AgentFactory根据typeId创建对应的Agent实例
 */

/**
 * Type ID到Class Name的映射
 */
export const AGENT_TYPE_TO_CLASS_MAP: Record<string, string> = {
  // Work Agents
  'work.web_scraper': 'WebScraperAgent',
  'work.api_collector': 'APICollectorAgent',
  'work.rss_collector': 'RSSCollectorAgent',
  
  // Process Agents
  'process.content_generator': 'ContentGeneratorAgent',
  'process.text_processor': 'TextProcessorAgent',
  
  // Publish Agents
  'publish.twitter': 'TwitterPublishAgent',
  'publish.linkedin': 'LinkedInPublishAgent',
  'publish.website': 'WebsitePublishAgent',
  
  // Validate Agents
  // TODO: 添加Validate agents的映射
};

/**
 * Class Name到Module Path的映射
 */
export const AGENT_CLASS_TO_MODULE_MAP: Record<string, string> = {
  // Work Agents
  'WebScraperAgent': '../agents/work/WebScraperAgent',
  'APICollectorAgent': '../agents/work/APICollectorAgent',
  'RSSCollectorAgent': '../agents/work/RSSCollectorAgent',
  
  // Process Agents
  'ContentGeneratorAgent': '../agents/process/ContentGeneratorAgent',
  'TextProcessorAgent': '../agents/process/TextProcessorAgent',
  
  // Publish Agents
  'TwitterPublishAgent': '../agents/publish/TwitterPublishAgent',
  'LinkedInPublishAgent': '../agents/publish/LinkedInPublishAgent',
  'WebsitePublishAgent': '../agents/publish/WebsitePublishAgent',
};

/**
 * 获取Type对应的实现信息
 */
export function getImplementationInfo(typeId: string): {
  className: string;
  modulePath: string;
  isAvailable: boolean;
} | null {
  const className = AGENT_TYPE_TO_CLASS_MAP[typeId];
  if (!className) {
    return null;
  }
  
  const modulePath = AGENT_CLASS_TO_MODULE_MAP[className];
  if (!modulePath) {
    return null;
  }
  
  return {
    className,
    modulePath,
    isAvailable: true // TODO: 实际检查模块是否存在
  };
}

/**
 * 检查Type是否有可用的实现
 */
export function hasImplementation(typeId: string): boolean {
  return typeId in AGENT_TYPE_TO_CLASS_MAP;
}

/**
 * 获取所有已实现的Type IDs
 */
export function getImplementedTypeIds(): string[] {
  return Object.keys(AGENT_TYPE_TO_CLASS_MAP);
}
