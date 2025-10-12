import {
  AgentTypeDefinition,
  AgentCategory,
  ConfigSchemaBuilder,
  ConfigFields
} from '@multi-agent-platform/shared';
import { getImplementationInfo } from './agent-type-mappings';

/**
 * 示例Agent类型定义 - 用于测试系统
 */
export const SAMPLE_AGENT_TYPES: AgentTypeDefinition[] = [
  // Web Scraper - WORK类型
  {
    id: 'work.web_scraper',
    name: 'Web Scraper',
    displayName: {
      zh: '网页抓取器',
      en: 'Web Scraper'
    },
    description: '使用CSS选择器从网页提取数据，支持分页和反爬虫机制',
    icon: '🌐',
    category: AgentCategory.WORK,
    categoryPath: 'WORK > Web Scraper',
    version: '1.2.0',
    author: 'Multi-Agent Platform Team',
    tags: ['网页抓取', '数据采集', 'CSS选择器', '反爬虫'],
    complexity: 'medium',
    popularity: 1250,
    rating: 4.8,
    features: [
      'CSS选择器支持',
      '自动分页处理',
      '速率限制',
      '数据清洗',
      '错误重试',
      '代理支持'
    ],
    capabilities: [
      '支持静态和动态网页',
      '自动处理JavaScript渲染',
      '智能反爬虫检测',
      '数据格式化和验证'
    ],
    limitations: [
      '不支持需要登录的页面',
      '对于重度JavaScript依赖的SPA支持有限',
      '单次抓取数据量建议不超过10000条'
    ],
    configSchema: (() => {
      const builder = new ConfigSchemaBuilder()
        .addBasicFields()
        .addField('url', ConfigFields.url('目标URL', '要抓取的网页地址'))
        .addField('selectors', ConfigFields.object('CSS选择器配置', '定义要提取的数据字段', {
          title: ConfigFields.cssSelector('标题选择器', '提取文章或内容标题的CSS选择器'),
          content: ConfigFields.cssSelector('内容选择器', '提取主要内容的CSS选择器')
        }))
        .addScheduleFields()
        .addErrorHandlingFields()
        .setRequired(['name', 'url', 'selectors']);
      
      return builder.build();
    })(),
    defaultConfig: {
      name: '网页抓取器',
      description: '抓取网页内容',
      enabled: true,
      url: 'https://example.com',
      selectors: {
        title: 'h1, .title',
        content: '.content, .article-body'
      },
      retries: 3,
      timeout: 30
    },
    configPresets: [
      {
        id: 'news-website',
        name: '新闻网站',
        description: '适用于大多数新闻网站的配置',
        scenario: '抓取新闻文章',
        config: {
          selectors: {
            title: 'h1, .headline, .article-title',
            content: '.article-content, .story-body, .post-content'
          }
        },
        tags: ['新闻', '文章'],
        isOfficial: true,
        usageCount: 450,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-01')
      }
    ],
    requirements: {
      minMemory: 512,
      minCpu: 1,
      minStorage: 100,
      dependencies: ['puppeteer', 'cheerio'],
      permissions: ['network.http', 'storage.write']
    },
    documentation: {
      overview: 'Web Scraper是一个强大的网页数据抓取工具',
      quickStart: '配置目标URL和CSS选择器即可开始抓取',
      apiReference: 'API参考文档',
      examples: [
        {
          title: '基础网页抓取',
          description: '抓取单个网页的标题和内容（适用场景：简单数据提取）',
          language: 'json',
          code: JSON.stringify({
            name: '新闻抓取器',
            url: 'https://news.example.com',
            selectors: {
              title: 'h1.headline',
              content: '.article-body'
            }
          }, null, 2),
          tags: ['基础', '新闻']
        }
      ]
    },
    status: 'stable',
    isAvailable: true,
    releaseDate: new Date('2024-01-01'),
    lastUpdated: new Date('2024-02-15'),
    implementation: getImplementationInfo('work.web_scraper') || undefined
  },

  // API Collector - WORK类型
  {
    id: 'work.api_collector',
    name: 'API Collector',
    displayName: {
      zh: 'API收集器',
      en: 'API Collector'
    },
    description: '从REST API收集数据，支持认证、分页和数据转换',
    icon: '🔌',
    category: AgentCategory.WORK,
    categoryPath: 'WORK > API Collector',
    version: '1.1.0',
    author: 'Multi-Agent Platform Team',
    tags: ['API', '数据收集', 'REST', 'JSON'],
    complexity: 'easy',
    popularity: 980,
    rating: 4.6,
    features: [
      'REST API支持',
      '多种认证方式',
      '自动分页',
      'JSON数据处理'
    ],
    capabilities: [
      '支持GET、POST、PUT、DELETE请求',
      'OAuth 2.0和API Key认证',
      '自动处理JSON响应'
    ],
    limitations: [
      '仅支持JSON格式响应',
      '不支持GraphQL'
    ],
    configSchema: (() => {
      const builder = new ConfigSchemaBuilder()
        .addBasicFields()
        .addField('endpoint', ConfigFields.url('API端点', 'API的URL地址'))
        .addField('method', ConfigFields.select('HTTP方法', 'HTTP请求方法', ['GET', 'POST', 'PUT', 'DELETE'], 'GET'))
        .addScheduleFields()
        .addErrorHandlingFields()
        .setRequired(['name', 'endpoint']);
      
      return builder.build();
    })(),
    defaultConfig: {
      name: 'API收集器',
      description: '从API收集数据',
      enabled: true,
      endpoint: 'https://api.example.com/data',
      method: 'GET',
      retries: 3,
      timeout: 30
    },
    configPresets: [],
    requirements: {
      minMemory: 256,
      minCpu: 1,
      minStorage: 50,
      dependencies: ['axios'],
      permissions: ['network.http']
    },
    documentation: {
      overview: 'API Collector用于从REST API收集结构化数据',
      quickStart: '配置API端点和认证信息即可开始收集数据',
      apiReference: 'API参考文档',
      examples: []
    },
    status: 'stable',
    isAvailable: true,
    releaseDate: new Date('2024-01-10'),
    lastUpdated: new Date('2024-02-01'),
    implementation: getImplementationInfo('work.api_collector') || undefined
  },

  // Content Generator - PROCESS类型
  {
    id: 'process.content_generator',
    name: 'Content Generator',
    displayName: {
      zh: '内容生成器',
      en: 'Content Generator'
    },
    description: '使用AI模型生成高质量内容，支持多种格式和风格',
    icon: '✍️',
    category: AgentCategory.PROCESS,
    categoryPath: 'PROCESS > Content Generator',
    version: '2.0.0',
    author: 'AI Content Labs',
    tags: ['AI生成', '内容创作', 'GPT', '文本处理'],
    complexity: 'medium',
    popularity: 2100,
    rating: 4.9,
    features: [
      '多种AI模型支持',
      '自定义提示词',
      '内容质量评分',
      '批量生成'
    ],
    capabilities: [
      '支持GPT-3.5、GPT-4等模型',
      '智能内容优化',
      '自动SEO优化'
    ],
    limitations: [
      '依赖外部AI服务',
      '生成内容需要人工审核'
    ],
    configSchema: (() => {
      const builder = new ConfigSchemaBuilder()
        .addBasicFields()
        .addField('aiModel', ConfigFields.select('AI模型', '选择使用的AI模型', ['gpt-3.5-turbo', 'gpt-4', 'claude-3'], 'gpt-3.5-turbo'))
        .addField('prompt', ConfigFields.textarea('提示词模板', '定义AI生成内容的指令', '请写一篇关于{topic}的文章...'))
        .addScheduleFields()
        .addErrorHandlingFields()
        .setRequired(['name', 'aiModel', 'prompt']);
      
      return builder.build();
    })(),
    defaultConfig: {
      name: '内容生成器',
      description: 'AI驱动的内容生成',
      enabled: true,
      aiModel: 'gpt-3.5-turbo',
      prompt: '请写一篇关于{topic}的专业文章',
      retries: 2,
      timeout: 60
    },
    configPresets: [],
    requirements: {
      minMemory: 512,
      minCpu: 1,
      minStorage: 100,
      dependencies: ['openai'],
      permissions: ['network.http', 'ai.generate']
    },
    documentation: {
      overview: 'AI驱动的内容生成工具',
      quickStart: '配置AI模型和提示词开始生成内容',
      apiReference: 'Content Generator API文档',
      examples: []
    },
    status: 'stable',
    isAvailable: true,
    releaseDate: new Date('2024-02-01'),
    lastUpdated: new Date('2024-02-20'),
    implementation: getImplementationInfo('process.content_generator') || undefined
  },

  // Twitter Publisher - PUBLISH类型
  {
    id: 'publish.twitter',
    name: 'Twitter Publisher',
    displayName: {
      zh: 'Twitter发布器',
      en: 'Twitter Publisher'
    },
    description: '自动发布内容到Twitter，支持定时发布和互动管理',
    icon: '🐦',
    category: AgentCategory.PUBLISH,
    categoryPath: 'PUBLISH > Twitter Publisher',
    version: '1.3.0',
    author: 'Social Media Team',
    tags: ['Twitter', '社交媒体', '自动发布', '营销'],
    complexity: 'medium',
    popularity: 1800,
    rating: 4.7,
    features: [
      'Twitter API v2支持',
      '定时发布',
      '媒体文件上传',
      '话题标签管理'
    ],
    capabilities: [
      '支持文本、图片、视频发布',
      '自动话题标签优化',
      '发布时间智能调度'
    ],
    limitations: [
      '需要Twitter API访问权限',
      '受Twitter发布频率限制'
    ],
    configSchema: (() => {
      const builder = new ConfigSchemaBuilder()
        .addBasicFields()
        .addField('apiKey', ConfigFields.apiKey('Twitter API密钥', 'Twitter API访问密钥'))
        .addField('content', ConfigFields.textarea('发布内容', '要发布的推文内容（最多280字符）', '输入推文内容...'))
        .addScheduleFields()
        .addErrorHandlingFields()
        .setRequired(['name', 'apiKey', 'content']);
      
      return builder.build();
    })(),
    defaultConfig: {
      name: 'Twitter发布器',
      description: '自动发布到Twitter',
      enabled: true,
      content: '',
      retries: 2,
      timeout: 30
    },
    configPresets: [],
    requirements: {
      minMemory: 256,
      minCpu: 1,
      minStorage: 50,
      dependencies: ['twitter-api-v2'],
      permissions: ['network.http', 'social.publish']
    },
    documentation: {
      overview: 'Twitter Publisher用于自动发布内容到Twitter',
      quickStart: '配置API密钥和发布内容即可开始',
      apiReference: 'Twitter Publisher API文档',
      examples: []
    },
    status: 'stable',
    isAvailable: true,
    releaseDate: new Date('2024-01-20'),
    lastUpdated: new Date('2024-02-10'),
    implementation: getImplementationInfo('publish.twitter') || undefined
  },

  // RSS Collector - WORK类型
  {
    id: 'work.rss_collector',
    name: 'RSS Collector',
    displayName: {
      zh: 'RSS订阅收集器',
      en: 'RSS Collector'
    },
    description: '从RSS/Atom订阅源收集内容，支持多种feed格式',
    icon: '📡',
    category: AgentCategory.WORK,
    categoryPath: 'WORK > RSS Collector',
    version: '1.1.0',
    author: 'Multi-Agent Platform Team',
    tags: ['RSS', 'Atom', '订阅', '内容聚合'],
    complexity: 'easy',
    popularity: 650,
    rating: 4.5,
    features: [
      'RSS 2.0支持',
      'Atom 1.0支持',
      '自动feed检测',
      '增量更新',
      '内容去重'
    ],
    capabilities: [
      '支持多种feed格式',
      '自动解析媒体内容',
      '智能更新检测'
    ],
    limitations: [
      '不支持需要认证的feed',
      '单个feed条目数限制'
    ],
    configSchema: (() => {
      const builder = new ConfigSchemaBuilder()
        .addBasicFields()
        .addField('feedUrl', ConfigFields.url('Feed URL', 'RSS/Atom订阅源地址'))
        .addField('updateInterval', ConfigFields.number('更新间隔（分钟）', '检查feed更新的时间间隔', 5, 1440, 30))
        .addScheduleFields()
        .addErrorHandlingFields()
        .setRequired(['name', 'feedUrl']);
      
      return builder.build();
    })(),
    defaultConfig: {
      name: 'RSS订阅收集器',
      description: '收集RSS订阅内容',
      enabled: true,
      feedUrl: 'https://example.com/feed.xml',
      updateInterval: 30,
      retries: 3,
      timeout: 30
    },
    configPresets: [],
    requirements: {
      minMemory: 128,
      minCpu: 1,
      minStorage: 50,
      dependencies: ['xml2js'],
      permissions: ['network.http', 'storage.write']
    },
    documentation: {
      overview: 'RSS Collector用于从RSS/Atom订阅源收集内容',
      quickStart: '配置feed URL即可开始收集订阅内容',
      apiReference: 'RSS Collector API文档',
      examples: []
    },
    status: 'stable',
    isAvailable: true,
    releaseDate: new Date('2024-01-05'),
    lastUpdated: new Date('2024-02-01'),
    implementation: getImplementationInfo('work.rss_collector') || undefined
  },

  // LinkedIn Publisher - PUBLISH类型
  {
    id: 'publish.linkedin',
    name: 'LinkedIn Publisher',
    displayName: {
      zh: 'LinkedIn发布器',
      en: 'LinkedIn Publisher'
    },
    description: '自动发布内容到LinkedIn，支持个人和公司页面',
    icon: '💼',
    category: AgentCategory.PUBLISH,
    categoryPath: 'PUBLISH > LinkedIn Publisher',
    version: '1.2.0',
    author: 'Social Media Team',
    tags: ['LinkedIn', '社交媒体', '职业社交', '营销'],
    complexity: 'medium',
    popularity: 1200,
    rating: 4.6,
    features: [
      'LinkedIn API支持',
      '个人和公司页面发布',
      '富文本格式',
      '媒体文件上传',
      '发布统计'
    ],
    capabilities: [
      '支持文本、图片、文档发布',
      '自动格式优化',
      '发布时间调度'
    ],
    limitations: [
      '需要LinkedIn API访问权限',
      '受LinkedIn发布频率限制'
    ],
    configSchema: (() => {
      const builder = new ConfigSchemaBuilder()
        .addBasicFields()
        .addField('apiKey', ConfigFields.apiKey('LinkedIn API密钥', 'LinkedIn API访问密钥'))
        .addField('content', ConfigFields.textarea('发布内容', '要发布的内容', '输入LinkedIn帖子内容...'))
        .addField('targetType', ConfigFields.select('发布目标', '选择发布到个人页面或公司页面', ['personal', 'company'], 'personal'))
        .addScheduleFields()
        .addErrorHandlingFields()
        .setRequired(['name', 'apiKey', 'content']);
      
      return builder.build();
    })(),
    defaultConfig: {
      name: 'LinkedIn发布器',
      description: '自动发布到LinkedIn',
      enabled: true,
      content: '',
      targetType: 'personal',
      retries: 2,
      timeout: 30
    },
    configPresets: [],
    requirements: {
      minMemory: 256,
      minCpu: 1,
      minStorage: 50,
      dependencies: ['linkedin-api'],
      permissions: ['network.http', 'social.publish']
    },
    documentation: {
      overview: 'LinkedIn Publisher用于自动发布内容到LinkedIn',
      quickStart: '配置API密钥和发布内容即可开始',
      apiReference: 'LinkedIn Publisher API文档',
      examples: []
    },
    status: 'stable',
    isAvailable: true,
    releaseDate: new Date('2024-01-25'),
    lastUpdated: new Date('2024-02-15'),
    implementation: getImplementationInfo('publish.linkedin') || undefined
  },

  // Website Publisher - PUBLISH类型
  {
    id: 'publish.website',
    name: 'Website Publisher',
    displayName: {
      zh: '网站发布器',
      en: 'Website Publisher'
    },
    description: '发布内容到网站，支持多种CMS和静态站点生成器',
    icon: '🌐',
    category: AgentCategory.PUBLISH,
    categoryPath: 'PUBLISH > Website Publisher',
    version: '1.3.0',
    author: 'Web Publishing Team',
    tags: ['网站', 'CMS', '静态站点', '发布'],
    complexity: 'easy',
    popularity: 890,
    rating: 4.4,
    features: [
      '多种CMS支持',
      'HTML模板系统',
      'SEO优化',
      '媒体文件管理',
      '自动部署'
    ],
    capabilities: [
      '支持WordPress、Hugo等',
      '自动HTML生成',
      'SEO元数据优化'
    ],
    limitations: [
      '需要网站访问权限',
      '部署时间取决于网站配置'
    ],
    configSchema: (() => {
      const builder = new ConfigSchemaBuilder()
        .addBasicFields()
        .addField('websiteUrl', ConfigFields.url('网站URL', '目标网站地址'))
        .addField('apiEndpoint', ConfigFields.url('API端点', '网站API接口地址'))
        .addField('apiKey', ConfigFields.apiKey('API密钥', '网站API访问密钥'))
        .addField('content', ConfigFields.textarea('发布内容', '要发布的内容', '输入文章内容...'))
        .addScheduleFields()
        .addErrorHandlingFields()
        .setRequired(['name', 'websiteUrl', 'apiEndpoint', 'content']);
      
      return builder.build();
    })(),
    defaultConfig: {
      name: '网站发布器',
      description: '发布内容到网站',
      enabled: true,
      websiteUrl: 'https://example.com',
      apiEndpoint: 'https://example.com/api',
      content: '',
      retries: 2,
      timeout: 60
    },
    configPresets: [],
    requirements: {
      minMemory: 256,
      minCpu: 1,
      minStorage: 100,
      dependencies: ['axios'],
      permissions: ['network.http', 'storage.write']
    },
    documentation: {
      overview: 'Website Publisher用于发布内容到各种网站平台',
      quickStart: '配置网站URL和API信息即可开始发布',
      apiReference: 'Website Publisher API文档',
      examples: []
    },
    status: 'stable',
    isAvailable: true,
    releaseDate: new Date('2024-01-15'),
    lastUpdated: new Date('2024-02-10'),
    implementation: getImplementationInfo('publish.website') || undefined
  }
];
