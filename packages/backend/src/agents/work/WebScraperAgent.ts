import {
  AgentConfig,
  DataSource,
  CollectedData,
  DataTarget,
  DataSourceType
} from '@multi-agent-platform/shared';
import { WorkAgent } from './WorkAgent';
import * as crypto from 'crypto';

/**
 * Web Scraper Agent
 * Scrapes data from web pages using CSS selectors and XPath
 */
export class WebScraperAgent extends WorkAgent {
  private pageCache: Map<string, any> = new Map();
  private lastFetchTimes: Map<string, Date> = new Map();

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, description);
  }

  /**
   * Initialize web scraper specific settings
   */
  protected async doInitialize(config: AgentConfig): Promise<void> {
    // Initialize web scraper-specific settings
    this.logger.info('Initializing Web Scraper Agent');
    
    // Clear caches
    this.pageCache.clear();
    this.lastFetchTimes.clear();
    
    // Validate web scraping-specific configuration
    if (config.dataSources) {
      for (const source of config.dataSources) {
        if (source.type === DataSourceType.WEB_SCRAPING) {
          try {
            await this.testDataSourceConnection(source);
          } catch (error) {
            // In development/test environment, connection test may fail
            // Log warning but don't fail initialization
            this.logger.warn(`Could not test connection to ${source.url}: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Collect data from web page target
   */
  protected async collectFromTarget(target: DataTarget): Promise<any> {
    this.logger.info(`Scraping web page: ${target.url}`);
    
    try {
      // Check rate limiting
      const lastFetch = this.lastFetchTimes.get(target.url);
      const minInterval = target.config?.rateLimit?.period || 5000; // 5 seconds default
      
      if (lastFetch && Date.now() - lastFetch.getTime() < minInterval) {
        this.logger.debug(`Skipping ${target.url} due to rate limiting`);
        return this.pageCache.get(target.url) || {};
      }

      // Fetch web page
      const response = await fetch(target.url, {
        headers: {
          'User-Agent': target.config?.userAgent || 'Multi-Agent-Platform Web Scraper 1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          ...target.config?.headers
        },
        timeout: target.config?.timeout || 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      const scrapedData = await this.scrapePageContent(htmlContent, target);
      
      // Update cache and fetch time
      this.pageCache.set(target.url, scrapedData);
      this.lastFetchTimes.set(target.url, new Date());
      
      return scrapedData;
    } catch (error) {
      this.logger.error(`Failed to scrape ${target.url}:`, error);
      throw error;
    }
  }

  /**
   * Clean and process scraped data
   */
  protected async cleanData(data: any, rules?: any[]): Promise<CollectedData> {
    this.logger.info('Cleaning scraped data');
    
    try {
      const cleanedItem: CollectedData = {
        id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId: data.url || 'unknown',
        url: data.url || '',
        title: this.cleanText(data.title || ''),
        content: this.cleanText(data.content || ''),
        metadata: {
          author: data.author || undefined,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
          tags: data.tags || [],
          category: data.category || undefined,
          language: this.detectLanguage(data.content || ''),
          wordCount: this.countWords(data.content || ''),
          readingTime: this.calculateReadingTime(data.content || ''),
          description: data.description || undefined,
          keywords: data.keywords || [],
          lastModified: data.lastModified ? new Date(data.lastModified) : undefined
        },
        media: data.media || [],
        collectedAt: new Date(),
        hash: this.generateHash(data.url || data.title || data.content || '')
      };

      // Apply cleaning rules if provided
      if (rules && rules.length > 0) {
        await this.applyCleaningRules(cleanedItem, rules);
      }

      return cleanedItem;
    } catch (error) {
      this.logger.error('Error cleaning scraped data:', error);
      throw error;
    }
  }

  /**
   * Get collection type
   */
  protected getCollectionType(): string {
    return 'web_scraper';
  }

  /**
   * Test web page connection
   */
  protected async testDataSourceConnection(source: DataSource): Promise<void> {
    try {
      const response = await fetch(source.url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Multi-Agent-Platform Web Scraper 1.0'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if it's HTML content
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        this.logger.warn(`Content type ${contentType} may not be HTML`);
      }

    } catch (error) {
      throw new Error(`Cannot connect to web page ${source.url}: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Scrape content from HTML using selectors
   */
  private async scrapePageContent(htmlContent: string, target: DataTarget): Promise<any> {
    const scrapedData: any = {
      url: target.url,
      scrapedAt: new Date().toISOString()
    };

    try {
      // Simple HTML parsing - in production, use a proper HTML parser like 'cheerio' or 'jsdom'
      const selectors = target.config?.selectors || {};

      // Extract title
      scrapedData.title = this.extractBySelector(htmlContent, selectors.title || 'title', 'text') ||
                         this.extractBySelector(htmlContent, 'h1', 'text') ||
                         'Untitled';

      // Extract main content
      scrapedData.content = this.extractBySelector(htmlContent, selectors.content || 'article, .content, .post-content, main', 'text') ||
                           this.extractBySelector(htmlContent, 'body', 'text') ||
                           '';

      // Extract description/summary
      scrapedData.description = this.extractBySelector(htmlContent, 'meta[name="description"]', 'content') ||
                               this.extractBySelector(htmlContent, selectors.description || '.summary, .excerpt', 'text') ||
                               '';

      // Extract author
      scrapedData.author = this.extractBySelector(htmlContent, selectors.author || '.author, [rel="author"], .byline', 'text') ||
                          this.extractBySelector(htmlContent, 'meta[name="author"]', 'content') ||
                          '';

      // Extract published date
      scrapedData.publishedAt = this.extractBySelector(htmlContent, selectors.publishedAt || 'time[datetime], .date, .published', 'datetime') ||
                               this.extractBySelector(htmlContent, 'meta[property="article:published_time"]', 'content') ||
                               '';

      // Extract keywords
      const keywordsStr = this.extractBySelector(htmlContent, 'meta[name="keywords"]', 'content') || '';
      scrapedData.keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

      // Extract tags
      scrapedData.tags = this.extractTags(htmlContent, selectors.tags);

      // Extract images
      scrapedData.media = await this.extractMedia(htmlContent, target.url);

      // Extract links if configured
      if (selectors.links) {
        scrapedData.links = this.extractLinks(htmlContent, target.url);
      }

      // Apply custom selectors
      if (target.config?.customSelectors) {
        for (const [key, selector] of Object.entries(target.config.customSelectors)) {
          scrapedData[key] = this.extractBySelector(htmlContent, selector as string, 'text');
        }
      }

      this.logger.info(`Scraped data from ${target.url}: title="${scrapedData.title}", content length=${scrapedData.content.length}`);
      return scrapedData;
    } catch (error) {
      this.logger.error('Error scraping page content:', error);
      throw new Error(`Failed to scrape page content: ${error.message}`);
    }
  }

  /**
   * Extract content by CSS selector
   */
  private extractBySelector(html: string, selector: string, attribute: string = 'text'): string {
    try {
      // Simple regex-based extraction - in production, use a proper HTML parser
      if (attribute === 'text') {
        // Extract text content
        if (selector === 'title') {
          const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
          return match ? this.decodeHTMLEntities(match[1].trim()) : '';
        }
        
        if (selector === 'body') {
          // Extract all text from body, removing scripts and styles
          let bodyContent = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
          bodyContent = bodyContent.replace(/<style[^>]*>.*?<\/style>/gis, '');
          bodyContent = bodyContent.replace(/<[^>]*>/g, ' ');
          return this.decodeHTMLEntities(bodyContent).replace(/\s+/g, ' ').trim();
        }

        // For other selectors, try to find by tag or class
        const tagMatch = selector.match(/^(\w+)$/);
        if (tagMatch) {
          const regex = new RegExp(`<${tagMatch[1]}[^>]*>(.*?)<\/${tagMatch[1]}>`, 'is');
          const match = html.match(regex);
          return match ? this.decodeHTMLEntities(match[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
        }

        // For class selectors
        const classMatch = selector.match(/\.([^,\s]+)/);
        if (classMatch) {
          const regex = new RegExp(`class=["'][^"']*${classMatch[1]}[^"']*["'][^>]*>(.*?)<\/\\w+>`, 'is');
          const match = html.match(regex);
          return match ? this.decodeHTMLEntities(match[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
        }

      } else if (attribute === 'content') {
        // Extract content attribute from meta tags
        const regex = new RegExp(`<meta[^>]+name=["']${selector.replace('meta[name="', '').replace('"]', '')}["'][^>]+content=["']([^"']+)["']`, 'i');
        const match = html.match(regex);
        return match ? this.decodeHTMLEntities(match[1]) : '';
        
      } else if (attribute === 'datetime') {
        // Extract datetime from time elements
        const timeRegex = /<time[^>]+datetime=["']([^"']+)["']/i;
        const match = html.match(timeRegex);
        return match ? match[1] : '';
      }

      return '';
    } catch (error) {
      this.logger.error(`Error extracting by selector ${selector}:`, error);
      return '';
    }
  }

  /**
   * Extract tags from HTML
   */
  private extractTags(html: string, tagSelector?: string): string[] {
    const tags: string[] = [];

    try {
      // Extract from meta keywords
      const keywordsMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
      if (keywordsMatch) {
        tags.push(...keywordsMatch[1].split(',').map(tag => tag.trim()));
      }

      // Extract hashtags from content
      const hashtagRegex = /#(\w+)/g;
      let match;
      while ((match = hashtagRegex.exec(html)) !== null) {
        tags.push(match[1].toLowerCase());
      }

      // Extract from tag elements if selector provided
      if (tagSelector) {
        // Simple tag extraction - would need proper HTML parser for complex selectors
        const tagElements = html.match(new RegExp(`<[^>]*class=["'][^"']*tag[^"']*["'][^>]*>(.*?)<\/\\w+>`, 'gi'));
        if (tagElements) {
          tagElements.forEach(element => {
            const textMatch = element.match(/>(.*?)</);
            if (textMatch) {
              tags.push(this.decodeHTMLEntities(textMatch[1]).trim());
            }
          });
        }
      }

      return [...new Set(tags.filter(tag => tag.length > 0))]; // Remove duplicates and empty tags
    } catch (error) {
      this.logger.error('Error extracting tags:', error);
      return [];
    }
  }

  /**
   * Extract media files from HTML
   */
  private async extractMedia(html: string, baseUrl: string): Promise<any[]> {
    const media: any[] = [];

    try {
      // Extract images
      const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let match;

      while ((match = imageRegex.exec(html)) !== null) {
        const src = this.resolveUrl(match[1], baseUrl);
        const altMatch = match[0].match(/alt=["']([^"']+)["']/i);
        
        media.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'image',
          url: src,
          filename: this.extractFilename(src),
          size: 0, // Would need to fetch to get actual size
          mimeType: this.getMimeTypeFromUrl(src),
          metadata: {
            alt: altMatch ? altMatch[1] : undefined
          }
        });
      }

      // Extract videos
      const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
      while ((match = videoRegex.exec(html)) !== null) {
        const src = this.resolveUrl(match[1], baseUrl);
        
        media.push({
          id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'video',
          url: src,
          filename: this.extractFilename(src),
          size: 0,
          mimeType: this.getMimeTypeFromUrl(src)
        });
      }

      // Extract audio
      const audioRegex = /<audio[^>]+src=["']([^"']+)["'][^>]*>/gi;
      while ((match = audioRegex.exec(html)) !== null) {
        const src = this.resolveUrl(match[1], baseUrl);
        
        media.push({
          id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'audio',
          url: src,
          filename: this.extractFilename(src),
          size: 0,
          mimeType: this.getMimeTypeFromUrl(src)
        });
      }

      return media;
    } catch (error) {
      this.logger.error('Error extracting media:', error);
      return [];
    }
  }

  /**
   * Extract links from HTML
   */
  private extractLinks(html: string, baseUrl: string): any[] {
    const links: any[] = [];

    try {
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const href = this.resolveUrl(match[1], baseUrl);
        const text = this.decodeHTMLEntities(match[2].replace(/<[^>]*>/g, '')).trim();
        
        if (href && text) {
          links.push({
            url: href,
            text: text,
            type: this.getLinkType(href)
          });
        }
      }

      return links;
    } catch (error) {
      this.logger.error('Error extracting links:', error);
      return [];
    }
  }

  /**
   * Apply cleaning rules to collected data
   */
  private async applyCleaningRules(data: CollectedData, rules: any[]): Promise<void> {
    for (const rule of rules) {
      try {
        switch (rule.type) {
          case 'remove_html':
            data.content = data.content.replace(/<[^>]*>/g, '');
            break;
          case 'filter_content':
            if (rule.pattern && !new RegExp(rule.pattern, 'i').test(data.content)) {
              data.content = ''; // Filter out content that doesn't match
            }
            break;
          case 'replace_text':
            if (rule.find && rule.replace !== undefined) {
              data.content = data.content.replace(new RegExp(rule.find, 'gi'), rule.replace);
            }
            break;
          case 'extract_summary':
            if (rule.maxLength && data.content.length > rule.maxLength) {
              data.content = data.content.substring(0, rule.maxLength) + '...';
            }
            break;
          case 'normalize_whitespace':
            data.content = data.content.replace(/\s+/g, ' ').trim();
            break;
        }
      } catch (error) {
        this.logger.error(`Error applying cleaning rule ${rule.type}:`, error);
      }
    }
  }

  /**
   * Clean text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Decode HTML entities
   */
  private decodeHTMLEntities(text: string): string {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&#39;': "'",
      '&nbsp;': ' ',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™'
    };

    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  /**
   * Get MIME type from URL extension
   */
  private getMimeTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'pdf': 'application/pdf'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Get link type
   */
  private getLinkType(url: string): string {
    if (url.includes('mailto:')) return 'email';
    if (url.includes('tel:')) return 'phone';
    if (url.startsWith('#')) return 'anchor';
    // Check if it's an internal link (same domain)
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(baseUrl);
      if (urlObj.hostname === baseUrlObj.hostname) return 'internal';
    } catch {
      // If URL parsing fails, treat as external
    }
    return 'external';
  }

  /**
   * Detect language (simple implementation)
   */
  private detectLanguage(text: string): string {
    // Simple language detection - in production, use a proper language detection library
    const commonEnglishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const englishWordCount = commonEnglishWords.reduce((count, word) => {
      return count + (text.toLowerCase().split(word).length - 1);
    }, 0);

    return englishWordCount > 2 ? 'en' : 'unknown';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate reading time in minutes
   */
  private calculateReadingTime(text: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Generate hash for deduplication
   */
  private generateHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Extract filename from URL
   */
  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'unknown';
    } catch {
      return url.split('/').pop() || 'unknown';
    }
  }
}