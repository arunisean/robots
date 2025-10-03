import { WebScraperAgent } from '../../../agents/work/WebScraperAgent';
import { AgentCategory, AgentConfig, DataSourceType } from '@multi-agent-platform/shared';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('WebScraperAgent', () => {
  let agent: WebScraperAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      id: 'test-scraper-agent',
      name: 'Test Web Scraper',
      description: 'Test web scraper agent',
      version: '1.0.0',
      category: AgentCategory.WORK,
      enabled: true,
      resources: {
        memory: 512,
        cpu: 1,
        timeout: 300,
        storage: 100
      },
      settings: {},
      dataSources: [
        {
          id: 'test-web-source',
          name: 'Test Website',
          type: DataSourceType.WEB_SCRAPING,
          url: 'https://example.com',
          config: {
            selectors: {
              title: 'h1',
              content: '.content',
              author: '.author'
            }
          }
        }
      ]
    };

    agent = new WebScraperAgent(
      mockConfig.id,
      mockConfig.name,
      mockConfig.version,
      mockConfig.description
    );

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize agent successfully', async () => {
      await agent.initialize(mockConfig);
      expect(agent.getStatus()).toBe('active');
    });

    it('should validate configuration', () => {
      const result = agent.validateConfig(mockConfig);
      expect(result.isValid).toBe(true);
    });
  });

  describe('web scraping', () => {
    const mockHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page Title</title>
  <meta name="description" content="This is a test page description">
  <meta name="author" content="Test Author">
  <meta name="keywords" content="test, scraping, html">
</head>
<body>
  <h1>Main Article Title</h1>
  <div class="author">John Doe</div>
  <div class="content">
    <p>This is the main content of the article with some <strong>important</strong> information.</p>
    <p>It contains multiple paragraphs and <a href="https://example.com/link">links</a>.</p>
    <img src="https://example.com/image.jpg" alt="Test Image">
  </div>
  <div class="tags">
    <span class="tag">Technology</span>
    <span class="tag">Web Scraping</span>
  </div>
  <time datetime="2024-01-01T12:00:00Z">January 1, 2024</time>
</body>
</html>`;

    beforeEach(async () => {
      await agent.initialize(mockConfig);
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHTML),
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null
        }
      });
    });

    it('should scrape data from web page', async () => {
      const target = {
        url: 'https://example.com/article',
        type: DataSourceType.WEB_SCRAPING,
        config: {
          selectors: {
            title: 'h1',
            content: '.content',
            author: '.author'
          }
        }
      };

      const result = await agent['collectFromTarget'](target);
      
      expect(result).toHaveProperty('title', 'Main Article Title');
      expect(result).toHaveProperty('author', 'John Doe');
      expect(result.content).toContain('main content of the article');
      expect(result).toHaveProperty('url', 'https://example.com/article');
    });

    it('should extract metadata from HTML', async () => {
      const target = {
        url: 'https://example.com/article',
        type: DataSourceType.WEB_SCRAPING,
        config: {}
      };

      const result = await agent['collectFromTarget'](target);
      
      expect(result).toHaveProperty('description', 'This is a test page description');
      expect(result.keywords).toContain('test');
      expect(result.keywords).toContain('scraping');
      expect(result.keywords).toContain('html');
    });

    it('should clean and process scraped data', async () => {
      const mockScrapedData = {
        url: 'https://example.com/article',
        title: 'Test Article Title',
        content: 'This is test content with <b>HTML</b> tags',
        description: 'Test description',
        author: 'Test Author',
        publishedAt: '2024-01-01T12:00:00Z',
        keywords: ['test', 'scraping'],
        media: []
      };

      const result = await agent['cleanData'](mockScrapedData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title', 'Test Article Title');
      expect(result).toHaveProperty('content', 'This is test content with <b>HTML</b> tags');
      expect(result).toHaveProperty('url', 'https://example.com/article');
      expect(result.metadata).toHaveProperty('author', 'Test Author');
      expect(result.metadata).toHaveProperty('description', 'Test description');
      expect(result.metadata).toHaveProperty('keywords');
      expect(result).toHaveProperty('hash');
    });

    it('should extract images from HTML', async () => {
      const target = {
        url: 'https://example.com/article',
        type: DataSourceType.WEB_SCRAPING,
        config: {}
      };

      const result = await agent['collectFromTarget'](target);
      
      expect(result.media).toBeInstanceOf(Array);
      expect(result.media.length).toBeGreaterThan(0);
      expect(result.media[0]).toHaveProperty('type', 'image');
      expect(result.media[0]).toHaveProperty('url', 'https://example.com/image.jpg');
    });

    it('should handle custom selectors', async () => {
      const target = {
        url: 'https://example.com/article',
        type: DataSourceType.WEB_SCRAPING,
        config: {
          customSelectors: {
            customField: '.custom-selector'
          }
        }
      };

      const result = await agent['collectFromTarget'](target);
      expect(result).toHaveProperty('customField');
    });

    it('should respect rate limiting', async () => {
      const target = {
        url: 'https://example.com/article',
        type: DataSourceType.WEB_SCRAPING,
        config: { rateLimit: { period: 1000 } }
      };

      // Reset mock call count
      (fetch as jest.Mock).mockClear();

      // First call should fetch
      await agent['collectFromTarget'](target);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call immediately should use cache (no additional fetch)
      const initialCallCount = (fetch as jest.Mock).mock.calls.length;
      await agent['collectFromTarget'](target);
      expect((fetch as jest.Mock).mock.calls.length).toBe(initialCallCount);
    });

    it('should handle fetch errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const target = {
        url: 'https://example.com/article',
        type: DataSourceType.WEB_SCRAPING,
        config: {}
      };

      await expect(agent['collectFromTarget'](target)).rejects.toThrow('Network error');
    });

    it('should handle HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const target = {
        url: 'https://example.com/article',
        type: DataSourceType.WEB_SCRAPING,
        config: {}
      };

      await expect(agent['collectFromTarget'](target)).rejects.toThrow('HTTP 404: Not Found');
    });
  });

  describe('HTML parsing', () => {
    it('should extract title from different selectors', () => {
      const html = '<html><head><title>Page Title</title></head><body><h1>Header Title</h1></body></html>';
      
      // Test title tag extraction
      const titleFromTag = agent['extractBySelector'](html, 'title', 'text');
      expect(titleFromTag).toBe('Page Title');
      
      // Test h1 extraction
      const titleFromH1 = agent['extractBySelector'](html, 'h1', 'text');
      expect(titleFromH1).toBe('Header Title');
    });

    it('should extract meta content', () => {
      const html = '<meta name="description" content="Test description">';
      const description = agent['extractBySelector'](html, 'meta[name="description"]', 'content');
      expect(description).toBe('Test description');
    });

    it('should decode HTML entities', () => {
      const encoded = 'Test &amp; Example with &quot;quotes&quot; and &lt;tags&gt;';
      const decoded = agent['decodeHTMLEntities'](encoded);
      expect(decoded).toBe('Test & Example with "quotes" and <tags>');
    });

    it('should resolve relative URLs', () => {
      const baseUrl = 'https://example.com/path/';
      const relativeUrl = '../image.jpg';
      const resolved = agent['resolveUrl'](relativeUrl, baseUrl);
      expect(resolved).toBe('https://example.com/image.jpg');
    });

    it('should extract links from HTML', () => {
      const html = '<a href="https://example.com/link">Link Text</a>';
      const baseUrl = 'https://example.com';
      const links = agent['extractLinks'](html, baseUrl);
      
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveProperty('url', 'https://example.com/link');
      expect(links[0]).toHaveProperty('text', 'Link Text');
    });
  });

  describe('data source connection testing', () => {
    it('should test web page connection successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null
        }
      });

      const dataSource = {
        id: 'test-source',
        name: 'Test Website',
        type: DataSourceType.WEB_SCRAPING,
        url: 'https://example.com',
        config: {}
      };

      await expect(agent['testDataSourceConnection'](dataSource)).resolves.not.toThrow();
    });

    it('should handle connection test failures', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const dataSource = {
        id: 'test-source',
        name: 'Test Website',
        type: DataSourceType.WEB_SCRAPING,
        url: 'https://example.com',
        config: {}
      };

      await expect(agent['testDataSourceConnection'](dataSource))
        .rejects.toThrow('Cannot connect to web page');
    });
  });

  describe('data cleaning and processing', () => {
    it('should apply cleaning rules', async () => {
      const mockData = {
        url: 'https://example.com/article',
        title: 'Test Article',
        content: 'This is <b>HTML</b> content with tags',
        description: 'Test description'
      };

      const rules = [
        { type: 'remove_html' },
        { type: 'normalize_whitespace' }
      ];

      const result = await agent['cleanData'](mockData, rules);
      expect(result.content).toBe('This is HTML content with tags');
    });

    it('should calculate reading time and word count', async () => {
      const longContent = 'word '.repeat(400); // 400 words
      const mockData = {
        url: 'https://example.com/article',
        title: 'Long Article',
        content: longContent,
        description: 'Test description'
      };

      const result = await agent['cleanData'](mockData);
      expect(result.metadata.wordCount).toBe(400);
      expect(result.metadata.readingTime).toBe(2); // 400 words / 200 wpm = 2 minutes
    });

    it('should detect language', async () => {
      const englishContent = 'This is an English article with common English words like the, and, or, but, in, on, at, to, for, of, with, by';
      const mockData = {
        url: 'https://example.com/article',
        title: 'English Article',
        content: englishContent,
        description: 'Test description'
      };

      const result = await agent['cleanData'](mockData);
      expect(result.metadata.language).toBe('en');
    });
  });

  describe('collection type', () => {
    it('should return correct collection type', () => {
      expect(agent['getCollectionType']()).toBe('web_scraper');
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      await agent.initialize(mockConfig);
      const isHealthy = await agent.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });
  });
});