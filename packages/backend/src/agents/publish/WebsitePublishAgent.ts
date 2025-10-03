import {
  AgentConfig,
  PublishTarget,
  PublishContent,
  PublishResult,
  PublishAgentConfig,
  PublishPlatform,
  PublishStatus,
  PublishMetrics
} from '@multi-agent-platform/shared';
import { PublishAgent } from './PublishAgent';
import * as crypto from 'crypto';

/**
 * Website Publish Agent
 * Publishes content to websites via HTTP APIs or file deployment
 */
export class WebsitePublishAgent extends PublishAgent {
  private httpClient: any = null;
  private publishHistory: any[] = [];
  private templateCache: Map<string, string> = new Map();

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, description);
    this.initializeTemplates();
  }

  /**
   * Initialize website publish agent
   */
  protected async doInitialize(config: AgentConfig): Promise<void> {
    this.logger.info('Initializing Website Publish Agent');
    
    const publishConfig = config as PublishAgentConfig;
    
    // Initialize publish targets
    if (publishConfig.targets) {
      this.publishTargets = publishConfig.targets.filter(t => t.platform === PublishPlatform.WEBSITE);
    }

    // Initialize HTTP client
    this.initializeHttpClient();

    this.logger.info(`Website publisher initialized with ${this.publishTargets.length} targets`);
  }

  /**
   * Format content for website platform
   */
  protected async formatForTarget(content: PublishContent): Promise<PublishContent> {
    this.logger.info('Formatting content for website');
    
    const target = this.publishTargets[0]; // Use first target for formatting rules
    const websiteConfig = target?.config?.website;
    const formatting = target?.config?.formatting;

    let formattedContent = content.content;
    let formattedMedia = [...content.media];

    // Apply website-specific formatting
    if (websiteConfig?.template) {
      formattedContent = await this.applyTemplate(content, websiteConfig.template);
    } else {
      formattedContent = await this.formatAsHTML(content);
    }

    // Apply SEO optimization if enabled
    if (websiteConfig?.seoOptimization) {
      formattedContent = await this.applySEOOptimization(formattedContent, content);
    }

    // Process media for web
    formattedMedia = await this.formatMediaForWeb(formattedMedia, formatting);

    return {
      ...content,
      content: formattedContent,
      media: formattedMedia
    };
  }

  /**
   * Publish content to website
   */
  protected async publishContent(content: PublishContent): Promise<PublishResult> {
    const target = this.publishTargets[0];
    if (!target) {
      throw new Error('No website target configured');
    }

    this.logger.info(`Publishing to website: ${target.name}`);
    
    const startTime = Date.now();
    
    try {
      // Publish content based on target configuration
      const websiteResponse = await this.deployToWebsite(content, target);
      
      const publishTime = Date.now() - startTime;
      
      // Create success result
      const result: PublishResult = {
        id: this.generatePublishId(),
        targetId: target.id,
        platform: PublishPlatform.WEBSITE,
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(),
        platformId: websiteResponse.id || websiteResponse.path,
        url: websiteResponse.url,
        metrics: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          impressions: 0,
          engagement: 0,
          reach: websiteResponse.estimatedReach || 0
        }
      };

      // Record in history
      this.publishHistory.push({
        id: result.id,
        contentId: content.id,
        targetId: target.id,
        platform: PublishPlatform.WEBSITE,
        status: PublishStatus.PUBLISHED,
        publishedAt: result.publishedAt,
        url: result.url,
        metrics: result.metrics,
        publishTime
      });

      // Generate sitemap if enabled
      if (target.config?.website?.generateSitemap) {
        await this.updateSitemap(target, result.url!);
      }

      this.logger.info(`Successfully published to website: ${result.url}`);
      return result;
      
    } catch (error) {
      this.logger.error('Failed to publish to website:', error);
      
      // Create failure result
      const result: PublishResult = {
        id: this.generatePublishId(),
        targetId: target.id,
        platform: PublishPlatform.WEBSITE,
        status: PublishStatus.FAILED,
        error: {
          code: this.getErrorCode(error),
          message: error.message,
          retryable: this.isRetryableError(error)
        }
      };

      // Record failed attempt
      this.publishHistory.push({
        id: result.id,
        contentId: content.id,
        targetId: target.id,
        platform: PublishPlatform.WEBSITE,
        status: PublishStatus.FAILED,
        error: error.message,
        publishTime: Date.now() - startTime
      });

      return result;
    }
  }

  /**
   * Publish content using agent-specific logic
   */
  protected async doPublishContent(content: PublishContent): Promise<PublishResult> {
    const formattedContent = await this.formatForTarget(content);
    return await this.publishContent(formattedContent);
  }

  /**
   * Get publishing history
   */
  protected async doGetPublishHistory(): Promise<any[]> {
    return [...this.publishHistory];
  }

  /**
   * Test website target connection
   */
  protected async testPublishTargetConnection(target: PublishTarget): Promise<void> {
    try {
      const websiteConfig = target.config?.website;
      if (!websiteConfig?.url) {
        throw new Error('Website URL not configured');
      }

      // Test HTTP connection
      const response = await this.makeHttpRequest('HEAD', websiteConfig.url, {}, target);
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      throw new Error(`Cannot connect to website ${target.name}: ${error.message}`);
    }
  }

  /**
   * Agent-specific cleanup logic
   */
  protected async doCleanup(): Promise<void> {
    this.publishHistory = [];
    this.httpClient = null;
    this.templateCache.clear();
    this.logger.info('Website publisher cleanup completed');
  }

  /**
   * Agent-specific health check logic
   */
  protected async doHealthCheck(): Promise<boolean> {
    // Check if targets are configured
    if (this.publishTargets.length === 0) {
      this.logger.warn('No website targets configured');
      return false;
    }

    // Check website connectivity
    for (const target of this.publishTargets.filter(t => t.enabled)) {
      try {
        await this.testPublishTargetConnection(target);
      } catch (error) {
        this.logger.warn(`Website target ${target.name} health check failed:`, error);
        return false;
      }
    }

    return true;
  }

  // Private helper methods

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    this.templateCache.set('blog_post', `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
    <meta name="keywords" content="{{keywords}}">
    <meta name="author" content="{{author}}">
    <meta property="og:title" content="{{title}}">
    <meta property="og:description" content="{{description}}">
    <meta property="og:url" content="{{url}}">
    <meta property="og:type" content="article">
    {{#if image}}
    <meta property="og:image" content="{{image}}">
    {{/if}}
</head>
<body>
    <article>
        <header>
            <h1>{{title}}</h1>
            {{#if author}}
            <p class="author">By {{author}}</p>
            {{/if}}
            {{#if publishedAt}}
            <time datetime="{{publishedAt}}">{{publishedDate}}</time>
            {{/if}}
        </header>
        
        <main>
            {{content}}
        </main>
        
        {{#if tags}}
        <footer>
            <div class="tags">
                {{#each tags}}
                <span class="tag">{{this}}</span>
                {{/each}}
            </div>
        </footer>
        {{/if}}
    </article>
</body>
</html>
    `.trim());

    this.templateCache.set('simple_page', `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
</head>
<body>
    <h1>{{title}}</h1>
    <div class="content">
        {{content}}
    </div>
</body>
</html>
    `.trim());

    this.templateCache.set('markdown', `
# {{title}}

{{#if description}}
> {{description}}
{{/if}}

{{content}}

{{#if tags}}
---
Tags: {{tags}}
{{/if}}
    `.trim());
  }

  /**
   * Initialize HTTP client
   */
  private initializeHttpClient(): void {
    // Mock HTTP client - in production, use a proper HTTP library
    this.httpClient = {
      request: async (method: string, url: string, data: any, headers: any) => {
        // Simulate HTTP request
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return {
          status: 200,
          statusText: 'OK',
          data: { success: true, id: `web_${Date.now()}` }
        };
      }
    };
  }

  /**
   * Apply template to content
   */
  private async applyTemplate(content: PublishContent, templateName: string): Promise<string> {
    const template = this.templateCache.get(templateName);
    if (!template) {
      this.logger.warn(`Template ${templateName} not found, using default HTML formatting`);
      return await this.formatAsHTML(content);
    }

    // Simple template replacement - in production, use a proper template engine
    let rendered = template;
    
    const replacements: { [key: string]: string } = {
      title: content.title || 'Untitled',
      description: content.summary || this.extractDescription(content.content),
      content: this.convertToHTML(content.content),
      keywords: content.metadata.tags?.join(', ') || '',
      author: content.metadata.author || '',
      url: '', // Will be filled after publishing
      publishedAt: new Date().toISOString(),
      publishedDate: new Date().toLocaleDateString(),
      tags: content.metadata.tags?.join(', ') || '',
      image: content.media.find(m => m.type === 'image')?.url || ''
    };

    // Replace template variables
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    // Handle conditional blocks (simple implementation)
    rendered = this.processConditionals(rendered, replacements);

    return rendered;
  }

  /**
   * Format content as HTML
   */
  private async formatAsHTML(content: PublishContent): Promise<string> {
    const htmlContent = this.convertToHTML(content.content);
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title || 'Untitled'}</title>`;

    if (content.summary) {
      html += `\n    <meta name="description" content="${content.summary}">`;
    }

    if (content.metadata.tags?.length) {
      html += `\n    <meta name="keywords" content="${content.metadata.tags.join(', ')}">`;
    }

    html += `
</head>
<body>
    <article>
        <h1>${content.title || 'Untitled'}</h1>
        <div class="content">
            ${htmlContent}
        </div>
    </article>
</body>
</html>`;

    return html;
  }

  /**
   * Convert text content to HTML
   */
  private convertToHTML(content: string): string {
    // Simple markdown-like conversion
    let html = content
      .replace(/\n\n/g, '</p><p>') // Paragraphs
      .replace(/\n/g, '<br>') // Line breaks
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Code
      .replace(/^# (.*$)/gm, '<h1>$1</h1>') // H1
      .replace(/^## (.*$)/gm, '<h2>$1</h2>') // H2
      .replace(/^### (.*$)/gm, '<h3>$1</h3>') // H3
      .replace(/^\* (.*$)/gm, '<li>$1</li>') // List items
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>'); // Wrap lists

    // Wrap in paragraphs if not already wrapped
    if (!html.includes('<p>') && !html.includes('<h')) {
      html = `<p>${html}</p>`;
    }

    return html;
  }

  /**
   * Apply SEO optimization
   */
  private async applySEOOptimization(content: string, originalContent: PublishContent): Promise<string> {
    // Add structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": originalContent.title,
      "description": originalContent.summary,
      "author": {
        "@type": "Person",
        "name": originalContent.metadata.author || "Unknown"
      },
      "datePublished": new Date().toISOString(),
      "keywords": originalContent.metadata.tags?.join(', ')
    };

    // Insert structured data before closing head tag
    const structuredDataScript = `
<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>`;

    content = content.replace('</head>', `${structuredDataScript}\n</head>`);

    // Add meta tags for better SEO
    const seoMeta = `
    <meta property="article:published_time" content="${new Date().toISOString()}">
    <meta property="article:author" content="${originalContent.metadata.author || 'Unknown'}">
    <meta property="article:section" content="${originalContent.metadata.category || 'General'}">`;

    content = content.replace('</head>', `${seoMeta}\n</head>`);

    return content;
  }

  /**
   * Format media for web
   */
  private async formatMediaForWeb(media: any[], formatting?: any): Promise<any[]> {
    const formattedMedia = [];

    for (const item of media) {
      const formattedItem = { ...item };

      // Apply image resizing if configured
      if (item.type === 'image' && formatting?.imageResize) {
        formattedItem.url = await this.resizeImage(item.url, formatting.imageResize);
      }

      // Generate thumbnails for videos
      if (item.type === 'video' && !item.thumbnail) {
        formattedItem.thumbnail = await this.generateVideoThumbnail(item.url);
      }

      formattedMedia.push(formattedItem);
    }

    return formattedMedia;
  }

  /**
   * Deploy content to website
   */
  private async deployToWebsite(content: PublishContent, target: PublishTarget): Promise<any> {
    const websiteConfig = target.config?.website;
    if (!websiteConfig) {
      throw new Error('Website configuration not found');
    }

    const method = websiteConfig.method || 'POST';
    const url = websiteConfig.url;

    // Prepare payload
    const payload = {
      title: content.title,
      content: content.content,
      summary: content.summary,
      tags: content.metadata.tags,
      author: content.metadata.author,
      media: content.media,
      publishedAt: new Date().toISOString()
    };

    // Make HTTP request
    const response = await this.makeHttpRequest(method, url, payload, target);

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Generate URL for the published content
    const publishedUrl = this.generatePublishedUrl(target, response.data);

    return {
      id: response.data.id || `web_${Date.now()}`,
      url: publishedUrl,
      estimatedReach: Math.floor(Math.random() * 500) + 50
    };
  }

  /**
   * Make HTTP request
   */
  private async makeHttpRequest(method: string, url: string, data: any, target: PublishTarget): Promise<any> {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'User-Agent': 'Multi-Agent-Platform Website Publisher 1.0'
    };

    // Add authentication headers
    if (target.authentication.type === 'bearer') {
      headers['Authorization'] = `Bearer ${target.authentication.credentials.token}`;
    } else if (target.authentication.type === 'api_key') {
      headers['X-API-Key'] = target.authentication.credentials.apiKey;
    } else if (target.authentication.type === 'basic') {
      const credentials = Buffer.from(
        `${target.authentication.credentials.username}:${target.authentication.credentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Mock HTTP request
    return await this.httpClient.request(method, url, data, headers);
  }

  /**
   * Generate published URL
   */
  private generatePublishedUrl(target: PublishTarget, responseData: any): string {
    const baseUrl = target.config?.website?.url || '';
    const slug = responseData.slug || responseData.id || `post-${Date.now()}`;
    
    // Remove trailing slash from base URL
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    return `${cleanBaseUrl}/${slug}`;
  }

  /**
   * Update sitemap
   */
  private async updateSitemap(target: PublishTarget, newUrl: string): Promise<void> {
    this.logger.info(`Updating sitemap with new URL: ${newUrl}`);
    
    // Mock sitemap update - in production, this would update the actual sitemap
    // This could involve reading the existing sitemap, adding the new URL, and uploading it
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Process template conditionals
   */
  private processConditionals(template: string, data: { [key: string]: string }): string {
    // Simple conditional processing - in production, use a proper template engine
    let processed = template;

    // Handle {{#if variable}} blocks
    const ifRegex = /{{#if (\w+)}}(.*?){{\/if}}/gs;
    processed = processed.replace(ifRegex, (match, variable, content) => {
      return data[variable] ? content : '';
    });

    // Handle {{#each array}} blocks (simplified)
    const eachRegex = /{{#each (\w+)}}(.*?){{\/each}}/gs;
    processed = processed.replace(eachRegex, (match, variable, content) => {
      const arrayData = data[variable];
      if (arrayData) {
        const items = arrayData.split(', ');
        return items.map(item => content.replace(/{{this}}/g, item)).join('');
      }
      return '';
    });

    return processed;
  }

  /**
   * Extract description from content
   */
  private extractDescription(content: string): string {
    // Extract first sentence or first 160 characters
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    
    if (firstSentence && firstSentence.length <= 160) {
      return firstSentence;
    }
    
    return content.substring(0, 157) + '...';
  }

  /**
   * Resize image (mock implementation)
   */
  private async resizeImage(imageUrl: string, resizeConfig: any): Promise<string> {
    // Mock image resizing - in production, use an image processing service
    this.logger.debug(`Resizing image: ${imageUrl} to ${resizeConfig.width}x${resizeConfig.height}`);
    
    // Return modified URL indicating resize parameters
    return `${imageUrl}?w=${resizeConfig.width}&h=${resizeConfig.height}&q=${resizeConfig.quality}`;
  }

  /**
   * Generate video thumbnail (mock implementation)
   */
  private async generateVideoThumbnail(videoUrl: string): Promise<string> {
    // Mock thumbnail generation - in production, use a video processing service
    this.logger.debug(`Generating thumbnail for video: ${videoUrl}`);
    
    // Return mock thumbnail URL
    return `${videoUrl.replace(/\.[^.]+$/, '')}_thumbnail.jpg`;
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.message?.includes('network')) return 'NETWORK_ERROR';
    if (error.message?.includes('timeout')) return 'TIMEOUT';
    if (error.message?.includes('authentication')) return 'AUTHENTICATION_FAILED';
    if (error.message?.includes('permission')) return 'PERMISSION_DENIED';
    return 'UNKNOWN_ERROR';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'];
    const errorCode = this.getErrorCode(error);
    return retryableCodes.includes(errorCode);
  }

  /**
   * Generate unique publish ID
   */
  private generatePublishId(): string {
    return `website-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}