import { RSSCollectorAgent } from '../../../agents/work/RSSCollectorAgent';
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

describe('RSSCollectorAgent', () => {
  let agent: RSSCollectorAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      id: 'test-rss-agent',
      name: 'Test RSS Collector',
      description: 'Test RSS collector agent',
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
          id: 'test-rss-source',
          name: 'Test RSS Feed',
          type: DataSourceType.RSS,
          url: 'https://example.com/feed.xml',
          config: {}
        }
      ]
    };

    agent = new RSSCollectorAgent(
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

  describe('RSS collection', () => {
    const mockRSSXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test RSS Feed</title>
    <description>A test RSS feed</description>
    <item>
      <title>Test Article 1</title>
      <link>https://example.com/article1</link>
      <description>This is a test article description</description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
      <author>Test Author</author>
      <category>Technology</category>
      <guid>https://example.com/article1</guid>
    </item>
    <item>
      <title>Test Article 2</title>
      <link>https://example.com/article2</link>
      <description>Another test article with &lt;b&gt;HTML&lt;/b&gt; content</description>
      <pubDate>Tue, 02 Jan 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    beforeEach(async () => {
      await agent.initialize(mockConfig);
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRSSXML),
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/rss+xml' : null
        }
      });
    });

    it('should collect data from RSS feed', async () => {
      const target = {
        url: 'https://example.com/feed.xml',
        type: DataSourceType.RSS,
        config: {}
      };

      const result = await agent['collectFromTarget'](target);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('title', 'Test Article 1');
      expect(result[0]).toHaveProperty('link', 'https://example.com/article1');
      expect(result[0]).toHaveProperty('feedTitle', 'Test RSS Feed');
    });

    it('should clean and process RSS data', async () => {
      const mockRSSData = {
        title: 'Test Article',
        link: 'https://example.com/article',
        description: 'Test description with <b>HTML</b> tags',
        pubDate: 'Mon, 01 Jan 2024 12:00:00 GMT',
        author: 'Test Author',
        category: 'Technology',
        feedUrl: 'https://example.com/feed.xml',
        feedTitle: 'Test Feed'
      };

      const result = await agent['cleanData'](mockRSSData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title', 'Test Article');
      expect(result).toHaveProperty('content', 'Test description with HTML tags');
      expect(result).toHaveProperty('url', 'https://example.com/article');
      expect(result.metadata).toHaveProperty('author', 'Test Author');
      expect(result.metadata).toHaveProperty('feedTitle', 'Test Feed');
      expect(result).toHaveProperty('hash');
    });

    it('should handle XML entities correctly', async () => {
      const xmlWithEntities = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test &amp; Feed</title>
    <item>
      <title>Article with &quot;quotes&quot; &amp; entities</title>
      <description>Content with &lt;tags&gt; and &nbsp; spaces</description>
    </item>
  </channel>
</rss>`;

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(xmlWithEntities),
        headers: { get: () => 'application/rss+xml' }
      });

      const target = {
        url: 'https://example.com/feed.xml',
        type: DataSourceType.RSS,
        config: {}
      };

      const result = await agent['collectFromTarget'](target);
      
      expect(result[0].title).toBe('Article with "quotes" & entities');
      expect(result[0].description).toBe('Content with <tags> and   spaces');
      expect(result[0].feedTitle).toBe('Test & Feed');
    });

    it('should extract media from RSS items', async () => {
      const mockRSSData = {
        title: 'Test Article',
        description: 'Article with <img src="https://example.com/image.jpg" alt="test"> image',
        enclosure: 'url="https://example.com/podcast.mp3" type="audio/mpeg"'
      };

      const result = await agent['cleanData'](mockRSSData);
      
      expect(result.media).toBeInstanceOf(Array);
      expect(result.media.length).toBeGreaterThan(0);
    });

    it('should respect rate limiting', async () => {
      const target = {
        url: 'https://example.com/feed.xml',
        type: DataSourceType.RSS,
        config: { minInterval: 1000 }
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
        url: 'https://example.com/feed.xml',
        type: DataSourceType.RSS,
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
        url: 'https://example.com/feed.xml',
        type: DataSourceType.RSS,
        config: {}
      };

      await expect(agent['collectFromTarget'](target)).rejects.toThrow('HTTP 404: Not Found');
    });
  });

  describe('data source connection testing', () => {
    it('should test RSS feed connection successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/rss+xml' : null
        }
      });

      const dataSource = {
        id: 'test-source',
        name: 'Test RSS',
        type: DataSourceType.RSS,
        url: 'https://example.com/feed.xml',
        config: {}
      };

      await expect(agent['testDataSourceConnection'](dataSource)).resolves.not.toThrow();
    });

    it('should handle connection test failures', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const dataSource = {
        id: 'test-source',
        name: 'Test RSS',
        type: DataSourceType.RSS,
        url: 'https://example.com/feed.xml',
        config: {}
      };

      await expect(agent['testDataSourceConnection'](dataSource))
        .rejects.toThrow('Cannot connect to RSS feed');
    });
  });

  describe('data cleaning and processing', () => {
    it('should apply cleaning rules', async () => {
      const mockData = {
        title: 'Test Article',
        description: 'This is a test article with some content to filter',
        link: 'https://example.com/article'
      };

      const rules = [
        { type: 'filter_content', pattern: 'test' },
        { type: 'replace_text', find: 'article', replace: 'post' }
      ];

      const result = await agent['cleanData'](mockData, rules);
      expect(result.content).toContain('post');
    });

    it('should extract tags from RSS content', async () => {
      const mockData = {
        title: 'Test Article #technology #rss',
        description: 'Content with #hashtags and categories',
        category: 'Technology',
        link: 'https://example.com/article'
      };

      const result = await agent['cleanData'](mockData);
      expect(result.metadata.tags).toContain('Technology');
      expect(result.metadata.tags).toContain('technology');
      expect(result.metadata.tags).toContain('rss');
    });

    it('should calculate reading time and word count', async () => {
      const longContent = 'word '.repeat(400); // 400 words
      const mockData = {
        title: 'Long Article',
        description: longContent,
        link: 'https://example.com/article'
      };

      const result = await agent['cleanData'](mockData);
      expect(result.metadata.wordCount).toBe(400);
      expect(result.metadata.readingTime).toBe(2); // 400 words / 200 wpm = 2 minutes
    });
  });

  describe('collection type', () => {
    it('should return correct collection type', () => {
      expect(agent['getCollectionType']()).toBe('rss_collector');
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