import {
  AgentConfig,
  DataSource,
  CollectedData,
  DataTarget,
  DataSourceType,
  CollectionSummary
} from '@multi-agent-platform/shared';
import { WorkAgent } from './WorkAgent';
import * as crypto from 'crypto';

/**
 * RSS Collector Agent
 * Collects data from RSS feeds and parses them into structured format
 */
export class RSSCollectorAgent extends WorkAgent {
  private feedCache: Map<string, any> = new Map();
  private lastFetchTimes: Map<string, Date> = new Map();

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, description);
  }

  /**
   * Initialize RSS collector specific settings
   */
  protected async doInitialize(config: AgentConfig): Promise<void> {
    // Initialize RSS-specific settings
    this.logger.info('Initializing RSS Collector Agent');
    
    // Clear caches
    this.feedCache.clear();
    this.lastFetchTimes.clear();
    
    // Validate RSS-specific configuration
    if (config.dataSources) {
      for (const source of config.dataSources) {
        if (source.type === DataSourceType.RSS) {
          try {
            await this.testDataSourceConnection(source);
          } catch (error) {
            // In development/test environment, connection test may fail
            // Log warning but don't fail initialization
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Could not test connection to ${source.url}: ${errorMessage}`);
          }
        }
      }
    }
  }

  /**
   * Collect data from RSS feed target
   */
  protected async collectFromTarget(target: DataTarget): Promise<any> {
    this.logger.info(`Collecting RSS data from: ${target.url}`);
    
    try {
      // Check cache and rate limiting
      const lastFetch = this.lastFetchTimes.get(target.url);
      const minInterval = target.config?.minInterval || 300000; // 5 minutes default
      
      if (lastFetch && Date.now() - lastFetch.getTime() < minInterval) {
        this.logger.debug(`Skipping ${target.url} due to rate limiting`);
        return this.feedCache.get(target.url) || [];
      }

      // Fetch RSS feed
      const response = await fetch(target.url, {
        headers: {
          'User-Agent': 'Multi-Agent-Platform RSS Collector 1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
          ...target.config?.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlContent = await response.text();
      const feedData = await this.parseRSSFeed(xmlContent, target.url);
      
      // Update cache and fetch time
      this.feedCache.set(target.url, feedData);
      this.lastFetchTimes.set(target.url, new Date());
      
      return feedData;
    } catch (error) {
      this.logger.error(`Failed to collect RSS from ${target.url}:`, error);
      throw error;
    }
  }

  /**
   * Clean and process RSS data
   */
  protected async cleanData(data: any, rules?: any[]): Promise<CollectedData> {
    this.logger.info('Cleaning RSS data');
    
    const items = Array.isArray(data) ? data : [data];
    const cleanedItems: CollectedData[] = [];

    for (const item of items) {
      try {
        const cleanedItem: CollectedData = {
          id: `rss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sourceId: item.feedUrl || 'unknown',
          url: item.link || item.url || '',
          title: this.cleanText(item.title || ''),
          content: this.cleanText(item.description || item.content || ''),
          metadata: {
            author: item.author || item.creator || undefined,
            publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
            tags: this.extractTags(item),
            category: item.category || undefined,
            language: this.detectLanguage(item.title || item.description || ''),
            wordCount: this.countWords(item.description || item.content || ''),
            readingTime: this.calculateReadingTime(item.description || item.content || ''),
            feedTitle: item.feedTitle,
            guid: item.guid
          },
          media: await this.extractMedia(item),
          collectedAt: new Date(),
          hash: this.generateHash(item.link || item.guid || item.title || '')
        };

        // Apply cleaning rules if provided
        if (rules && rules.length > 0) {
          await this.applyCleaningRules(cleanedItem, rules);
        }

        cleanedItems.push(cleanedItem);
      } catch (error) {
        this.logger.error('Error cleaning RSS item:', error);
        // Continue with other items
      }
    }

    return cleanedItems.length === 1 ? cleanedItems[0] : cleanedItems as any;
  }

  /**
   * Get collection type
   */
  protected getCollectionType(): string {
    return 'rss_collector';
  }

  /**
   * Test RSS feed connection
   */
  protected async testDataSourceConnection(source: DataSource): Promise<void> {
    try {
      const response = await fetch(source.url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Multi-Agent-Platform RSS Collector 1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if it's likely an RSS/XML feed
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('xml') && !contentType.includes('rss')) {
        this.logger.warn(`Content type ${contentType} may not be RSS/XML`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Cannot connect to RSS feed ${source.url}: ${errorMessage}`);
    }
  }

  // Private helper methods

  /**
   * Parse RSS/Atom feed XML content
   */
  private async parseRSSFeed(xmlContent: string, feedUrl: string): Promise<any[]> {
    // Simple XML parsing - in production, use a proper XML parser like 'fast-xml-parser'
    const items: any[] = [];
    
    try {
      // Extract feed title
      const feedTitleMatch = xmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
      const feedTitle = feedTitleMatch ? this.decodeXMLEntities(feedTitleMatch[1]) : 'Unknown Feed';

      // Extract items (RSS) or entries (Atom)
      const itemRegex = /<(?:item|entry)[^>]*>(.*?)<\/(?:item|entry)>/gis;
      let match;

      while ((match = itemRegex.exec(xmlContent)) !== null) {
        const itemXml = match[1];
        const item = this.parseRSSItem(itemXml, feedUrl, feedTitle);
        if (item) {
          items.push(item);
        }
      }

      this.logger.info(`Parsed ${items.length} items from RSS feed`);
      return items;
    } catch (error) {
      this.logger.error('Error parsing RSS feed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse RSS feed: ${errorMessage}`);
    }
  }

  /**
   * Parse individual RSS item
   */
  private parseRSSItem(itemXml: string, feedUrl: string, feedTitle: string): any {
    const item: any = {
      feedUrl,
      feedTitle
    };

    // Extract common fields
    const fields = {
      title: /<title[^>]*>(.*?)<\/title>/i,
      link: /<link[^>]*>(.*?)<\/link>/i,
      description: /<description[^>]*>(.*?)<\/description>/i,
      content: /<content:encoded[^>]*>(.*?)<\/content:encoded>/i,
      pubDate: /<pubDate[^>]*>(.*?)<\/pubDate>/i,
      published: /<published[^>]*>(.*?)<\/published>/i,
      updated: /<updated[^>]*>(.*?)<\/updated>/i,
      author: /<author[^>]*>(.*?)<\/author>/i,
      creator: /<dc:creator[^>]*>(.*?)<\/dc:creator>/i,
      category: /<category[^>]*>(.*?)<\/category>/i,
      guid: /<guid[^>]*>(.*?)<\/guid>/i,
      id: /<id[^>]*>(.*?)<\/id>/i
    };

    for (const [key, regex] of Object.entries(fields)) {
      const match = itemXml.match(regex);
      if (match) {
        item[key] = this.decodeXMLEntities(match[1].trim());
      }
    }

    // Handle Atom-style links
    if (!item.link) {
      const atomLinkMatch = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (atomLinkMatch) {
        item.link = atomLinkMatch[1];
      }
    }

    // Use published/updated for pubDate if not found
    if (!item.pubDate) {
      item.pubDate = item.published || item.updated;
    }

    // Use id for guid if not found
    if (!item.guid) {
      item.guid = item.id;
    }

    return item;
  }

  /**
   * Extract media files from RSS item
   */
  private async extractMedia(item: any): Promise<any[]> {
    const media: any[] = [];

    // Extract enclosures (podcasts, videos, etc.)
    if (item.enclosure) {
      const enclosureMatch = item.enclosure.match(/url=["']([^"']+)["']/);
      if (enclosureMatch) {
        media.push({
          id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: this.getMediaType(enclosureMatch[1]),
          url: enclosureMatch[1],
          filename: this.extractFilename(enclosureMatch[1]),
          size: 0, // Would need to fetch to get actual size
          mimeType: 'application/octet-stream'
        });
      }
    }

    // Extract images from content
    const imageRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const content = item.description || item.content || '';
    let imageMatch;

    while ((imageMatch = imageRegex.exec(content)) !== null) {
      media.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        url: imageMatch[1],
        filename: this.extractFilename(imageMatch[1]),
        size: 0,
        mimeType: 'image/jpeg' // Default, would need to check actual type
      });
    }

    return media;
  }

  /**
   * Extract tags from RSS item
   */
  private extractTags(item: any): string[] {
    const tags: string[] = [];

    // Add category as tag
    if (item.category) {
      tags.push(item.category);
    }

    // Extract hashtags from title and description
    const text = `${item.title || ''} ${item.description || ''}`;
    const hashtagRegex = /#(\w+)/g;
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      tags.push(match[1].toLowerCase());
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Apply cleaning rules to collected data
   */
  private async applyCleaningRules(data: CollectedData, rules: any[]): Promise<void> {
    for (const rule of rules) {
      try {
        switch (rule.type) {
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
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Decode XML entities
   */
  private decodeXMLEntities(text: string): string {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&#39;': "'",
      '&nbsp;': ' '
    };

    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
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
   * Get media type from URL
   */
  private getMediaType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      return 'audio';
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
      return 'document';
    }
    
    return 'unknown';
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