import {
  AgentConfig,
  PublishTarget,
  PublishContent,
  PublishResult,
  PublishAgentConfig,
  PublishPlatform,
  PublishStatus,
  PublishMetrics,
  ContentFormatting
} from '@multi-agent-platform/shared';
import { PublishAgent } from './PublishAgent';
import * as crypto from 'crypto';

/**
 * Twitter Publish Agent
 * Publishes content to Twitter with proper formatting and media handling
 */
export class TwitterPublishAgent extends PublishAgent {
  private twitterClient: any = null;
  private publishHistory: any[] = [];
  private rateLimitTracker: Map<string, number> = new Map();

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, description);
  }

  /**
   * Initialize Twitter publish agent
   */
  protected async doInitialize(config: AgentConfig): Promise<void> {
    this.logger.info('Initializing Twitter Publish Agent');
    
    const publishConfig = config as PublishAgentConfig;
    
    // Initialize publish targets
    if (publishConfig.targets) {
      this.publishTargets = publishConfig.targets.filter(t => t.platform === PublishPlatform.TWITTER);
    }

    // Initialize Twitter client for each target
    for (const target of this.publishTargets) {
      if (target.enabled) {
        await this.initializeTwitterClient(target);
      }
    }

    this.logger.info(`Twitter publisher initialized with ${this.publishTargets.length} targets`);
  }

  /**
   * Format content for Twitter platform
   */
  protected async formatForTarget(content: PublishContent): Promise<PublishContent> {
    this.logger.info('Formatting content for Twitter');
    
    const target = this.publishTargets[0]; // Use first target for formatting rules
    const twitterConfig = target?.config?.twitter;
    const formatting = target?.config?.formatting;

    let formattedContent = content.content;
    let formattedMedia = [...content.media];

    // Apply Twitter-specific formatting
    formattedContent = await this.formatTextForTwitter(formattedContent, formatting);
    
    // Handle hashtags
    if (twitterConfig?.hashtagStrategy) {
      formattedContent = this.applyHashtagStrategy(formattedContent, content.metadata.tags || [], twitterConfig.hashtagStrategy);
    }

    // Handle mentions
    if (twitterConfig?.mentionStrategy) {
      formattedContent = this.applyMentionStrategy(formattedContent, twitterConfig.mentionStrategy);
    }

    // Format media for Twitter
    if (twitterConfig?.includeMedia && formattedMedia.length > 0) {
      formattedMedia = await this.formatMediaForTwitter(formattedMedia);
    } else {
      formattedMedia = [];
    }

    return {
      ...content,
      content: formattedContent,
      media: formattedMedia
    };
  }

  /**
   * Publish content to Twitter
   */
  protected async publishContent(content: PublishContent): Promise<PublishResult> {
    const target = this.publishTargets[0];
    if (!target) {
      throw new Error('No Twitter target configured');
    }

    this.logger.info(`Publishing to Twitter: ${target.name}`);
    
    const startTime = Date.now();
    
    try {
      // Check rate limits
      await this.checkRateLimit(target.id);
      
      // Publish content
      const twitterResponse = await this.postToTwitter(content, target);
      
      const publishTime = Date.now() - startTime;
      
      // Create success result
      const result: PublishResult = {
        id: this.generatePublishId(),
        targetId: target.id,
        platform: PublishPlatform.TWITTER,
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(),
        platformId: twitterResponse.id,
        url: `https://twitter.com/${twitterResponse.username}/status/${twitterResponse.id}`,
        metrics: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          impressions: 0,
          engagement: 0,
          reach: twitterResponse.estimatedReach || 0
        }
      };

      // Record in history
      this.publishHistory.push({
        id: result.id,
        contentId: content.id,
        targetId: target.id,
        platform: PublishPlatform.TWITTER,
        status: PublishStatus.PUBLISHED,
        publishedAt: result.publishedAt,
        url: result.url,
        metrics: result.metrics,
        publishTime
      });

      // Update rate limit tracker
      this.updateRateLimit(target.id);

      this.logger.info(`Successfully published to Twitter: ${result.url}`);
      return result;
      
    } catch (error) {
      this.logger.error('Failed to publish to Twitter:', error);
      
      // Create failure result
      const result: PublishResult = {
        id: this.generatePublishId(),
        targetId: target.id,
        platform: PublishPlatform.TWITTER,
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
        platform: PublishPlatform.TWITTER,
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
   * Test Twitter target connection
   */
  protected async testPublishTargetConnection(target: PublishTarget): Promise<void> {
    try {
      if (!this.twitterClient) {
        await this.initializeTwitterClient(target);
      }

      // Test with a simple API call
      await this.verifyTwitterCredentials(target);
    } catch (error) {
      throw new Error(`Cannot connect to Twitter for target ${target.name}: ${error.message}`);
    }
  }

  /**
   * Agent-specific cleanup logic
   */
  protected async doCleanup(): Promise<void> {
    this.publishHistory = [];
    this.twitterClient = null;
    this.rateLimitTracker.clear();
    this.logger.info('Twitter publisher cleanup completed');
  }

  /**
   * Agent-specific health check logic
   */
  protected async doHealthCheck(): Promise<boolean> {
    // Check if targets are configured
    if (this.publishTargets.length === 0) {
      this.logger.warn('No Twitter targets configured');
      return false;
    }

    // Check Twitter API connection
    for (const target of this.publishTargets.filter(t => t.enabled)) {
      try {
        await this.testPublishTargetConnection(target);
      } catch (error) {
        this.logger.warn(`Twitter target ${target.name} health check failed:`, error);
        return false;
      }
    }

    return true;
  }

  // Private helper methods

  /**
   * Initialize Twitter client
   */
  private async initializeTwitterClient(target: PublishTarget): Promise<void> {
    this.logger.info(`Initializing Twitter client for target: ${target.name}`);
    
    // This would initialize the actual Twitter API client
    // For now, create a mock client
    this.twitterClient = {
      targetId: target.id,
      credentials: target.authentication.credentials,
      config: target.config
    };
  }

  /**
   * Format text content for Twitter
   */
  private async formatTextForTwitter(content: string, formatting?: ContentFormatting): Promise<string> {
    let formatted = content;

    // Apply Twitter character limit (280 characters)
    const maxLength = formatting?.maxLength || 280;
    
    if (formatted.length > maxLength) {
      switch (formatting?.truncateStrategy || 'cut') {
        case 'cut':
          formatted = formatted.substring(0, maxLength - 3) + '...';
          break;
        case 'summarize':
          formatted = await this.summarizeForTwitter(formatted, maxLength);
          break;
        case 'split':
          // For thread mode, we'll handle this in the posting logic
          break;
      }
    }

    // Clean up formatting
    formatted = formatted
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim();

    // Shorten links if enabled
    if (formatting?.linkShortening) {
      formatted = await this.shortenLinks(formatted);
    }

    return formatted;
  }

  /**
   * Apply hashtag strategy
   */
  private applyHashtagStrategy(content: string, tags: string[], strategy: string): string {
    switch (strategy) {
      case 'preserve':
        return content; // Keep existing hashtags as-is
      
      case 'add':
        const hashtags = tags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');
        return content + (hashtags ? `\n\n${hashtags}` : '');
      
      case 'remove':
        return content.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
      
      default:
        return content;
    }
  }

  /**
   * Apply mention strategy
   */
  private applyMentionStrategy(content: string, strategy: string): string {
    switch (strategy) {
      case 'preserve':
        return content; // Keep existing mentions as-is
      
      case 'remove':
        return content.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
      
      default:
        return content;
    }
  }

  /**
   * Format media for Twitter
   */
  private async formatMediaForTwitter(media: any[]): Promise<any[]> {
    const formattedMedia = [];
    
    // Twitter supports up to 4 images or 1 video
    const images = media.filter(m => m.type === 'image').slice(0, 4);
    const videos = media.filter(m => m.type === 'video').slice(0, 1);
    
    // Prioritize video over images
    if (videos.length > 0) {
      formattedMedia.push(...videos);
    } else if (images.length > 0) {
      formattedMedia.push(...images);
    }

    return formattedMedia;
  }

  /**
   * Post content to Twitter
   */
  private async postToTwitter(content: PublishContent, target: PublishTarget): Promise<any> {
    // Mock Twitter API call
    // In production, this would use the actual Twitter API
    
    const twitterConfig = target.config?.twitter;
    
    // Check if content should be posted as a thread
    if (twitterConfig?.threadMode && content.content.length > 280) {
      return await this.postTwitterThread(content, target);
    }

    // Single tweet
    const mockResponse = {
      id: `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: target.authentication.credentials.username || 'testuser',
      text: content.content,
      created_at: new Date().toISOString(),
      estimatedReach: Math.floor(Math.random() * 1000) + 100,
      media: content.media.map(m => ({
        id: `media_${Date.now()}`,
        type: m.type,
        url: m.url
      }))
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return mockResponse;
  }

  /**
   * Post Twitter thread
   */
  private async postTwitterThread(content: PublishContent, target: PublishTarget): Promise<any> {
    // Split content into tweets
    const tweets = this.splitIntoTweets(content.content);
    const threadResponses = [];

    let previousTweetId: string | undefined;

    for (let i = 0; i < tweets.length; i++) {
      const tweetContent = `${tweets[i]} ${i + 1}/${tweets.length}`;
      
      const mockResponse = {
        id: `tweet_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        username: target.authentication.credentials.username || 'testuser',
        text: tweetContent,
        created_at: new Date().toISOString(),
        in_reply_to_status_id: previousTweetId,
        estimatedReach: Math.floor(Math.random() * 1000) + 100
      };

      threadResponses.push(mockResponse);
      previousTweetId = mockResponse.id;

      // Simulate API delay between tweets
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Return the first tweet as the main response
    return {
      ...threadResponses[0],
      thread: threadResponses,
      estimatedReach: threadResponses.reduce((sum, tweet) => sum + tweet.estimatedReach, 0)
    };
  }

  /**
   * Split content into tweets
   */
  private splitIntoTweets(content: string): string[] {
    const maxLength = 270; // Leave room for thread numbering
    const tweets: string[] = [];
    
    if (content.length <= maxLength) {
      return [content];
    }

    // Split by sentences first
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentTweet = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentTweet.length + trimmedSentence.length + 1 <= maxLength) {
        currentTweet += (currentTweet ? '. ' : '') + trimmedSentence;
      } else {
        if (currentTweet) {
          tweets.push(currentTweet + '.');
        }
        
        // If single sentence is too long, split by words
        if (trimmedSentence.length > maxLength) {
          const words = trimmedSentence.split(' ');
          let wordTweet = '';
          
          for (const word of words) {
            if (wordTweet.length + word.length + 1 <= maxLength) {
              wordTweet += (wordTweet ? ' ' : '') + word;
            } else {
              if (wordTweet) {
                tweets.push(wordTweet);
              }
              wordTweet = word;
            }
          }
          
          if (wordTweet) {
            currentTweet = wordTweet;
          }
        } else {
          currentTweet = trimmedSentence;
        }
      }
    }

    if (currentTweet) {
      tweets.push(currentTweet + '.');
    }

    return tweets;
  }

  /**
   * Summarize content for Twitter
   */
  private async summarizeForTwitter(content: string, maxLength: number): Promise<string> {
    // Simple summarization - take first sentence and key points
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return content.substring(0, maxLength - 3) + '...';
    }

    let summary = sentences[0].trim();
    
    if (summary.length > maxLength - 3) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
  }

  /**
   * Shorten links in content
   */
  private async shortenLinks(content: string): Promise<string> {
    // Mock link shortening - in production, use a service like bit.ly
    const urlRegex = /https?:\/\/[^\s]+/g;
    
    return content.replace(urlRegex, (url) => {
      // Mock shortened URL
      return `https://short.ly/${Math.random().toString(36).substr(2, 6)}`;
    });
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(targetId: string): Promise<void> {
    const now = Date.now();
    const lastPost = this.rateLimitTracker.get(targetId) || 0;
    const minInterval = 60000; // 1 minute between posts

    if (now - lastPost < minInterval) {
      const waitTime = minInterval - (now - lastPost);
      this.logger.info(`Rate limit: waiting ${waitTime}ms before posting`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Update rate limit tracker
   */
  private updateRateLimit(targetId: string): void {
    this.rateLimitTracker.set(targetId, Date.now());
  }

  /**
   * Verify Twitter credentials
   */
  private async verifyTwitterCredentials(target: PublishTarget): Promise<void> {
    // Mock credential verification
    // In production, this would call Twitter's verify_credentials endpoint
    
    if (!target.authentication.credentials.apiKey || !target.authentication.credentials.apiSecret) {
      throw new Error('Missing Twitter API credentials');
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.message?.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED';
    if (error.message?.includes('authentication')) return 'AUTHENTICATION_FAILED';
    if (error.message?.includes('duplicate')) return 'DUPLICATE_CONTENT';
    return 'UNKNOWN_ERROR';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = ['RATE_LIMIT_EXCEEDED', 'NETWORK_ERROR', 'TIMEOUT'];
    const errorCode = this.getErrorCode(error);
    return retryableCodes.includes(errorCode);
  }

  /**
   * Generate unique publish ID
   */
  private generatePublishId(): string {
    return `twitter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}