import { AgentTypeDefinition, AgentCategory } from '@multi-agent-platform/shared';

/**
 * Web Scraper Agent Type Definition
 * 网页抓取器Agent类型定义
 */
export const webScraperType: AgentTypeDefinition = {
  id: 'work.web_scraper',
  name: 'Web Scraper',
  displayName: {
    zh: '网页抓取器',
    en: 'Web Scraper'
  },
  description: 'Extract data from websites using CSS selectors and XPath',
  icon: '🌐',
  
  category: AgentCategory.WORK,
  categoryPath: 'WORK > Web Scraper',
  
  version: '1.0.0',
  author: 'Multi-Agent Platform Team',
  tags: ['web', 'scraping', 'data-collection', 'html', 'css-selector'],
  complexity: 'medium',
  popularity: 1250,
  rating: 4.7,
  
  features: [
    'CSS选择器支持',
    '速率限制和重试机制',
    '数据清洗和转换',
    '分页自动处理',
    '错误处理和日志'
  ],
  
  capabilities: [
    '静态网页抓取',
    '动态内容提取',
    '批量URL处理',
    '数据格式化',
    '增量更新'
  ],
  
  limitations: [
    '不支持JavaScript渲染（需要使用浏览器模式）',
    '受目标网站反爬虫策略限制',
    '需要遵守robots.txt规则'
  ],
  
  configSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Agent名称',
        description: '为这个抓取器起一个描述性的名称',
        default: '我的网页抓取器',
        minLength: 1,
        maxLength: 100,
        ui: {
          widget: 'input',
          placeholder: '例如：新闻网站抓取器',
          helpText: '建议使用能够描述抓取目标的名称',
          group: 'basic',
          order: 1
        }
      },
      description: {
        type: 'string',
        title: '描述',
        description: '简要说明这个抓取器的用途',
        default: '',
        maxLength: 500,
        ui: {
          widget: 'textarea',
          placeholder: '例如：从新闻网站抓取最新文章标题和内容',
          helpText: '可选，但建议填写以便后续管理',
          group: 'basic',
          order: 2
        }
      },
      url: {
        type: 'string',
        title: '目标URL',
        description: '要抓取的网页地址',
        pattern: '^https?://.+',
        ui: {
          widget: 'input',
          placeholder: 'https://example.com',
          helpText: '支持HTTP和HTTPS协议',
          group: 'datasource',
          order: 3
        }
      },
      selectors: {
        type: 'object',
        title: 'CSS选择器',
        description: '定义要提取的数据字段和对应的CSS选择器',
        properties: {
          title: {
            type: 'string',
            title: '标题选择器',
            description: '提取标题的CSS选择器',
            default: '.article-title',
            ui: {
              widget: 'input',
              placeholder: '.article-title, h1.title',
              helpText: '使用浏览器开发工具查找元素的CSS选择器'
            }
          },
          content: {
            type: 'string',
            title: '内容选择器',
            description: '提取内容的CSS选择器',
            default: '.article-content',
            ui: {
              widget: 'input',
              placeholder: '.article-content, .post-body',
              helpText: '可以使用多个选择器，用逗号分隔'
            }
          },
          author: {
            type: 'string',
            title: '作者选择器',
            description: '提取作者的CSS选择器（可选）',
            default: '',
            ui: {
              widget: 'input',
              placeholder: '.author-name',
              helpText: '可选字段'
            }
          },
          date: {
            type: 'string',
            title: '日期选择器',
            description: '提取发布日期的CSS选择器（可选）',
            default: '',
            ui: {
              widget: 'input',
              placeholder: '.publish-date',
              helpText: '可选字段'
            }
          }
        },
        ui: {
          widget: 'input',
          group: 'datasource',
          order: 4
        }
      },
      pagination: {
        type: 'object',
        title: '分页设置',
        description: '配置分页抓取（可选）',
        properties: {
          enabled: {
            type: 'boolean',
            title: '启用分页',
            description: '是否抓取多个页面',
            default: false,
            ui: {
              widget: 'checkbox',
              helpText: '启用后将自动处理分页'
            }
          },
          nextPageSelector: {
            type: 'string',
            title: '下一页选择器',
            description: '下一页链接的CSS选择器',
            default: '',
            ui: {
              widget: 'input',
              placeholder: '.next-page, a.pagination-next',
              helpText: '仅在启用分页时需要',
              conditional: {
                field: 'pagination.enabled',
                value: true
              }
            }
          },
          maxPages: {
            type: 'number',
            title: '最大页数',
            description: '最多抓取多少页',
            default: 10,
            minimum: 1,
            maximum: 100,
            ui: {
              widget: 'slider',
              helpText: '建议不超过50页',
              conditional: {
                field: 'pagination.enabled',
                value: true
              }
            }
          }
        },
        ui: {
          widget: 'input',
          group: 'advanced',
          order: 5
        }
      },
      rateLimit: {
        type: 'object',
        title: '速率限制',
        description: '控制请求频率，避免被封禁',
        properties: {
          requestsPerSecond: {
            type: 'number',
            title: '每秒请求数',
            description: '限制每秒最多发送多少个请求',
            default: 1,
            minimum: 0.1,
            maximum: 10,
            ui: {
              widget: 'slider',
              helpText: '建议设置为1-2，避免对目标网站造成压力'
            }
          },
          delayBetweenRequests: {
            type: 'number',
            title: '请求间隔（毫秒）',
            description: '每个请求之间的延迟时间',
            default: 1000,
            minimum: 100,
            maximum: 10000,
            ui: {
              widget: 'input',
              helpText: '1000毫秒 = 1秒'
            }
          }
        },
        ui: {
          widget: 'input',
          group: 'advanced',
          order: 6
        }
      },
      retry: {
        type: 'object',
        title: '重试设置',
        description: '请求失败时的重试策略',
        properties: {
          maxRetries: {
            type: 'number',
            title: '最大重试次数',
            description: '请求失败后最多重试几次',
            default: 3,
            minimum: 0,
            maximum: 10,
            ui: {
              widget: 'slider',
              helpText: '建议设置为3-5次'
            }
          },
          retryDelay: {
            type: 'number',
            title: '重试延迟（毫秒）',
            description: '重试前等待的时间',
            default: 2000,
            minimum: 1000,
            maximum: 30000,
            ui: {
              widget: 'input',
              helpText: '建议设置为2000-5000毫秒'
            }
          }
        },
        ui: {
          widget: 'input',
          group: 'advanced',
          order: 7
        }
      },
      headers: {
        type: 'object',
        title: '自定义请求头',
        description: '设置HTTP请求头（可选）',
        properties: {
          userAgent: {
            type: 'string',
            title: 'User-Agent',
            description: '浏览器标识',
            default: 'Mozilla/5.0 (compatible; MultiAgentBot/1.0)',
            ui: {
              widget: 'input',
              helpText: '模拟浏览器访问'
            }
          }
        },
        ui: {
          widget: 'input',
          group: 'advanced',
          order: 8
        }
      }
    },
    required: ['name', 'url', 'selectors'],
    dependencies: {
      'pagination.nextPageSelector': ['pagination.enabled'],
      'pagination.maxPages': ['pagination.enabled']
    }
  },
  
  defaultConfig: {
    name: '我的网页抓取器',
    description: '',
    url: 'https://example.com',
    selectors: {
      title: '.article-title',
      content: '.article-content'
    },
    pagination: {
      enabled: false,
      maxPages: 10
    },
    rateLimit: {
      requestsPerSecond: 1,
      delayBetweenRequests: 1000
    },
    retry: {
      maxRetries: 3,
      retryDelay: 2000
    },
    headers: {
      userAgent: 'Mozilla/5.0 (compatible; MultiAgentBot/1.0)'
    }
  },
  
  configPresets: [
    {
      id: 'news-website',
      name: '新闻网站抓取',
      description: '适用于大多数新闻网站的通用配置',
      scenario: '抓取新闻文章的标题、内容、作者和发布时间',
      config: {
        name: '新闻网站抓取器',
        selectors: {
          title: 'h1.article-title, .post-title, h1',
          content: '.article-content, .post-content, article',
          author: '.author-name, .by-author, .author',
          date: '.publish-date, .post-date, time'
        },
        rateLimit: {
          requestsPerSecond: 1,
          delayBetweenRequests: 1500
        }
      },
      tags: ['news', 'article', 'common'],
      isOfficial: true,
      usageCount: 450,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-02-01')
    },
    {
      id: 'ecommerce-product',
      name: '电商产品数据',
      description: '抓取电商网站的产品信息',
      scenario: '提取产品名称、价格、描述和图片',
      config: {
        name: '电商产品抓取器',
        selectors: {
          title: '.product-title, h1.product-name',
          content: '.product-description, .product-details',
          price: '.product-price, .price',
          image: '.product-image img'
        },
        pagination: {
          enabled: true,
          nextPageSelector: '.pagination-next, a.next',
          maxPages: 20
        }
      },
      tags: ['ecommerce', 'product', 'shopping'],
      isOfficial: true,
      usageCount: 320,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-02-10')
    }
  ],
  
  requirements: {
    minMemory: 256,
    minCpu: 0.5,
    minStorage: 100,
    dependencies: ['axios', 'cheerio'],
    permissions: ['network.http', 'network.https']
  },
  
  documentation: {
    overview: `
# Web Scraper 概述

Web Scraper是一个强大的网页数据抓取工具，可以从任何网站提取结构化数据。

## 主要特性

- **CSS选择器**: 使用简单的CSS选择器定位页面元素
- **智能分页**: 自动处理多页内容
- **速率控制**: 内置速率限制，避免被封禁
- **错误重试**: 自动重试失败的请求
- **数据清洗**: 自动清理和格式化提取的数据

## 适用场景

- 新闻文章采集
- 产品信息抓取
- 价格监控
- 内容聚合
- 数据研究
    `,
    
    quickStart: `
# 快速开始

## 1. 基本配置

\`\`\`json
{
  "name": "我的第一个抓取器",
  "url": "https://example.com/articles",
  "selectors": {
    "title": ".article-title",
    "content": ".article-content"
  }
}
\`\`\`

## 2. 查找CSS选择器

1. 打开目标网页
2. 右键点击要提取的元素
3. 选择"检查"或"审查元素"
4. 在开发者工具中找到元素的class或id
5. 使用 \`.classname\` 或 \`#id\` 作为选择器

## 3. 测试运行

配置完成后，点击"测试运行"按钮验证配置是否正确。
    `,
    
    apiReference: `
# API参考

## 配置参数

### 基本参数

- **name** (string, required): Agent名称
- **description** (string, optional): 描述
- **url** (string, required): 目标URL

### 选择器配置

- **selectors** (object, required): CSS选择器映射
  - 支持任意自定义字段
  - 每个字段对应一个CSS选择器

### 分页配置

- **pagination.enabled** (boolean): 是否启用分页
- **pagination.nextPageSelector** (string): 下一页链接选择器
- **pagination.maxPages** (number): 最大页数

### 速率限制

- **rateLimit.requestsPerSecond** (number): 每秒请求数
- **rateLimit.delayBetweenRequests** (number): 请求间隔（毫秒）

### 重试策略

- **retry.maxRetries** (number): 最大重试次数
- **retry.retryDelay** (number): 重试延迟（毫秒）
    `,
    
    examples: [
      {
        title: '基本网页抓取',
        description: '抓取单个网页的标题和内容',
        code: `{
  "name": "简单抓取器",
  "url": "https://example.com/article",
  "selectors": {
    "title": "h1",
    "content": ".content"
  }
}`,
        language: 'json',
        tags: ['basic', 'simple']
      },
      {
        title: '多页抓取',
        description: '抓取多个页面的内容',
        code: `{
  "name": "多页抓取器",
  "url": "https://example.com/articles",
  "selectors": {
    "title": ".article-title",
    "content": ".article-body"
  },
  "pagination": {
    "enabled": true,
    "nextPageSelector": ".next-page",
    "maxPages": 10
  }
}`,
        language: 'json',
        tags: ['pagination', 'advanced']
      }
    ],
    
    faq: [
      {
        question: '如何找到正确的CSS选择器？',
        answer: '使用浏览器的开发者工具（F12），右键点击要提取的元素，选择"检查"，然后查看元素的class或id属性。',
        tags: ['selector', 'beginner']
      },
      {
        question: '为什么抓取失败？',
        answer: '常见原因包括：1) CSS选择器不正确 2) 网站需要登录 3) 网站有反爬虫机制 4) 网络连接问题。建议先使用测试功能验证配置。',
        tags: ['troubleshooting', 'error']
      },
      {
        question: '如何避免被网站封禁？',
        answer: '1) 设置合理的速率限制 2) 使用真实的User-Agent 3) 遵守robots.txt规则 4) 避免在高峰时段大量抓取。',
        tags: ['best-practice', 'rate-limit']
      }
    ],
    
    changelog: [
      {
        version: '1.0.0',
        date: new Date('2024-01-15'),
        changes: [
          '初始版本发布',
          '支持基本的CSS选择器抓取',
          '实现分页功能',
          '添加速率限制和重试机制'
        ]
      }
    ]
  },
  
  status: 'stable',
  isAvailable: true,
  releaseDate: new Date('2024-01-15'),
  lastUpdated: new Date('2024-02-01')
};
