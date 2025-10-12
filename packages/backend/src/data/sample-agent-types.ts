import {
  AgentTypeDefinition,
  AgentCategory
} from '@multi-agent-platform/shared';

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
    configSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '名称',
          description: 'Agent的显示名称',
          ui: {
            widget: 'input',
            placeholder: '请输入Agent名称'
          }
        },
        description: {
          type: 'string',
          title: '描述',
          description: 'Agent的功能描述',
          ui: {
            widget: 'textarea',
            placeholder: '请描述这个Agent的功能和用途'
          }
        },
        url: {
          type: 'string',
          title: '目标URL',
          description: '要抓取的网页地址',
          ui: {
            widget: 'input',
            placeholder: 'https://example.com'
          }
        },
        selectors: {
          type: 'object',
          title: 'CSS选择器配置',
          description: '定义要提取的数据字段',
          properties: {
            title: {
              type: 'string',
              title: '标题选择器',
              description: '提取文章或内容标题的CSS选择器',
              ui: {
                widget: 'input',
                placeholder: 'h1, .title'
              }
            },
            content: {
              type: 'string',
              title: '内容选择器',
              description: '提取主要内容的CSS选择器',
              ui: {
                widget: 'input',
                placeholder: '.content, .article-body'
              }
            }
          },
          ui: {
            widget: 'input'
          }
        }
      },
      required: ['name', 'url', 'selectors']
    },
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
          description: '抓取单个网页的标题和内容',
          scenario: '简单数据提取',
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
    lastUpdated: new Date('2024-02-15')
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
    configSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '名称',
          description: 'Agent的显示名称',
          ui: { widget: 'input' }
        },
        description: {
          type: 'string',
          title: '描述',
          description: 'Agent的功能描述',
          ui: { widget: 'textarea' }
        },
        endpoint: {
          type: 'string',
          title: 'API端点',
          description: 'API的URL地址',
          ui: { widget: 'input', placeholder: 'https://api.example.com/data' }
        },
        method: {
          type: 'string',
          title: 'HTTP方法',
          description: 'HTTP请求方法',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'GET',
          ui: { widget: 'select' }
        }
      },
      required: ['name', 'endpoint']
    },
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
    lastUpdated: new Date('2024-02-01')
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
    configSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '名称',
          description: 'Agent的显示名称',
          ui: { widget: 'input' }
        },
        description: {
          type: 'string',
          title: '描述',
          description: 'Agent的功能描述',
          ui: { widget: 'textarea' }
        },
        aiModel: {
          type: 'string',
          title: 'AI模型',
          description: '选择使用的AI模型',
          enum: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'],
          default: 'gpt-3.5-turbo',
          ui: { widget: 'select' }
        },
        prompt: {
          type: 'string',
          title: '提示词模板',
          description: '定义AI生成内容的指令',
          ui: { widget: 'textarea', placeholder: '请写一篇关于{topic}的文章...' }
        }
      },
      required: ['name', 'aiModel', 'prompt']
    },
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
    lastUpdated: new Date('2024-02-20')
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
    configSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '名称',
          description: 'Agent的显示名称',
          ui: { widget: 'input' }
        },
        description: {
          type: 'string',
          title: '描述',
          description: 'Agent的功能描述',
          ui: { widget: 'textarea' }
        },
        apiKey: {
          type: 'string',
          title: 'Twitter API密钥',
          description: 'Twitter API访问密钥',
          ui: { widget: 'input', placeholder: '请输入API密钥' }
        },
        content: {
          type: 'string',
          title: '发布内容',
          description: '要发布的推文内容（最多280字符）',
          ui: { widget: 'textarea', placeholder: '输入推文内容...' }
        }
      },
      required: ['name', 'apiKey', 'content']
    },
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
    lastUpdated: new Date('2024-02-10')
  }
];
