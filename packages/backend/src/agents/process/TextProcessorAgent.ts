import {
  AgentConfig,
  ProcessedData,
  ProcessAgentConfig,
  ProcessingRule,
  ProcessingType,
  QualityScore,
  ProcessedContent,
  ProcessedMetadata,
  LLMConfig,
  LLMUsage
} from '@multi-agent-platform/shared';
import { ProcessAgent } from './ProcessAgent';
import * as crypto from 'crypto';

/**
 * Text Processor Agent
 * Processes and transforms text content using various NLP techniques
 */
export class TextProcessorAgent extends ProcessAgent {
  private llmService: any = null;
  private processingHistory: any[] = [];

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, description);
  }

  /**
   * Initialize text processor specific settings
   */
  protected async doInitialize(config: AgentConfig): Promise<void> {
    this.logger.info('Initializing Text Processor Agent');
    
    const processConfig = config as ProcessAgentConfig;
    
    // Initialize processing rules
    if (processConfig.processingRules) {
      this.processingRules = processConfig.processingRules.sort((a, b) => a.order - b.order);
    }

    // Initialize LLM service if configured
    if (processConfig.llmConfig) {
      await this.initializeLLMService(processConfig.llmConfig);
    }

    this.logger.info(`Text processor initialized with ${this.processingRules.length} rules`);
  }

  /**
   * Process content using text processing rules
   */
  protected async processContent(data: any): Promise<ProcessedData> {
    this.logger.info('Processing text content');
    
    const startTime = Date.now();
    const appliedRules: string[] = [];
    let processedContent = data.content || data.text || String(data);
    let llmUsage: LLMUsage | undefined;

    try {
      // Apply processing rules in order
      for (const rule of this.processingRules.filter(r => r.enabled)) {
        try {
          this.logger.debug(`Applying rule: ${rule.name}`);
          
          switch (rule.type) {
            case ProcessingType.TEXT_PROCESSING:
              processedContent = await this.applyTextProcessing(processedContent, rule);
              break;
            case ProcessingType.CONTENT_GENERATION:
              const generationResult = await this.applyContentGeneration(processedContent, rule);
              processedContent = generationResult.content;
              if (generationResult.llmUsage) {
                llmUsage = this.mergeLLMUsage(llmUsage, generationResult.llmUsage);
              }
              break;
            case ProcessingType.SUMMARIZATION:
              const summaryResult = await this.applySummarization(processedContent, rule);
              processedContent = summaryResult.content;
              if (summaryResult.llmUsage) {
                llmUsage = this.mergeLLMUsage(llmUsage, summaryResult.llmUsage);
              }
              break;
            case ProcessingType.SENTIMENT_ANALYSIS:
              // Sentiment analysis doesn't change content but adds metadata
              break;
            default:
              this.logger.warn(`Unsupported processing type: ${rule.type}`);
          }
          
          appliedRules.push(rule.name);
        } catch (error) {
          this.logger.error(`Error applying rule ${rule.name}:`, error);
          // Continue with other rules
        }
      }

      const processingTime = Date.now() - startTime;

      // Create processed data
      const processedData: ProcessedData = {
        id: `processed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId: data.id || data.sourceId || 'unknown',
        originalData: data,
        processedContent: {
          content: processedContent,
          title: this.extractTitle(processedContent),
          summary: await this.generateSummary(processedContent),
          keywords: this.extractKeywords(processedContent),
          tags: this.extractTags(processedContent),
          category: this.classifyContent(processedContent)
        },
        metadata: {
          processingRules: appliedRules,
          processingTime,
          llmUsage,
          transformations: this.getTransformations(appliedRules),
          language: this.detectLanguage(processedContent),
          readabilityScore: this.calculateReadabilityScore(processedContent),
          sentimentScore: this.analyzeSentiment(processedContent)
        },
        qualityScore: await this.calculateQualityScore(processedContent, appliedRules),
        processedAt: new Date()
      };

      // Record processing history
      this.processingHistory.push({
        id: processedData.id,
        timestamp: new Date(),
        inputSize: String(data).length,
        outputSize: processedContent.length,
        processingTime,
        rulesApplied: appliedRules,
        qualityScore: processedData.qualityScore.overall,
        status: 'success'
      });

      return processedData;
    } catch (error) {
      this.logger.error('Error processing content:', error);
      
      // Record failed processing
      this.processingHistory.push({
        id: `failed_${Date.now()}`,
        timestamp: new Date(),
        inputSize: String(data).length,
        outputSize: 0,
        processingTime: Date.now() - startTime,
        rulesApplied: appliedRules,
        qualityScore: 0,
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Perform quality check on processed data
   */
  protected async checkQuality(data: ProcessedData): Promise<ProcessedData> {
    this.logger.info('Performing quality check');
    
    // Quality check is already performed in processContent
    // This method can be used for additional validation
    
    if (data.qualityScore.overall < 0.5) {
      this.logger.warn(`Low quality score: ${data.qualityScore.overall}`);
      
      // Add quality issues
      data.qualityScore.issues.push({
        type: 'low_quality',
        severity: 'medium',
        description: 'Content quality score is below threshold',
        suggestion: 'Consider reviewing and improving the content'
      });
    }

    return data;
  }

  /**
   * Process data using configured rules
   */
  protected async doProcessData(data: any): Promise<ProcessedData> {
    return await this.processContent(data);
  }

  /**
   * Get processing history
   */
  protected async doGetProcessingHistory(): Promise<any[]> {
    return [...this.processingHistory];
  }

  /**
   * Test LLM service connection
   */
  protected async testLLMConnection(): Promise<void> {
    if (!this.llmService) {
      throw new Error('LLM service not configured');
    }

    try {
      // Test with a simple prompt
      await this.callLLMService('Test connection', { maxTokens: 10 });
    } catch (error) {
      throw new Error(`LLM service connection failed: ${error.message}`);
    }
  }

  /**
   * Agent-specific cleanup logic
   */
  protected async doCleanup(): Promise<void> {
    this.processingHistory = [];
    this.llmService = null;
    this.logger.info('Text processor cleanup completed');
  }

  /**
   * Agent-specific health check logic
   */
  protected async doHealthCheck(): Promise<boolean> {
    // Check if processing rules are configured
    if (this.processingRules.length === 0) {
      this.logger.warn('No processing rules configured');
      return false;
    }

    // Check LLM service if configured
    if (this.llmService) {
      try {
        await this.testLLMConnection();
      } catch (error) {
        this.logger.warn('LLM service health check failed:', error);
        return false;
      }
    }

    return true;
  }

  // Private helper methods

  /**
   * Initialize LLM service
   */
  private async initializeLLMService(config: LLMConfig): Promise<void> {
    this.logger.info(`Initializing LLM service: ${config.provider}/${config.model}`);
    
    // This would initialize the actual LLM service
    // For now, create a mock service
    this.llmService = {
      provider: config.provider,
      model: config.model,
      config: config
    };
  }

  /**
   * Apply text processing rule
   */
  private async applyTextProcessing(content: string, rule: ProcessingRule): Promise<string> {
    const operations = rule.config.textProcessing?.operations || [];
    let processedContent = content;

    for (const operation of operations) {
      switch (operation.type) {
        case 'clean':
          processedContent = this.cleanText(processedContent);
          break;
        case 'extract':
          if (operation.pattern) {
            const matches = processedContent.match(new RegExp(operation.pattern, 'gi'));
            processedContent = matches ? matches.join(' ') : processedContent;
          }
          break;
        case 'replace':
          if (operation.pattern && operation.replacement !== undefined) {
            processedContent = processedContent.replace(
              new RegExp(operation.pattern, 'gi'),
              operation.replacement
            );
          }
          break;
        case 'format':
          processedContent = this.formatText(processedContent, operation.options);
          break;
      }
    }

    return processedContent;
  }

  /**
   * Apply content generation rule
   */
  private async applyContentGeneration(content: string, rule: ProcessingRule): Promise<{ content: string; llmUsage?: LLMUsage }> {
    if (!this.llmService) {
      throw new Error('LLM service not configured for content generation');
    }

    const config = rule.config.contentGeneration;
    const prompt = this.buildGenerationPrompt(content, config);
    
    const result = await this.callLLMService(prompt, {
      maxTokens: config?.length === 'short' ? 100 : config?.length === 'long' ? 500 : 250,
      temperature: 0.7
    });

    return {
      content: result.content,
      llmUsage: result.usage
    };
  }

  /**
   * Apply summarization rule
   */
  private async applySummarization(content: string, rule: ProcessingRule): Promise<{ content: string; llmUsage?: LLMUsage }> {
    if (!this.llmService) {
      // Fallback to extractive summarization
      return {
        content: this.extractiveSummarization(content)
      };
    }

    const prompt = `Please summarize the following text in a concise manner:\n\n${content}`;
    
    const result = await this.callLLMService(prompt, {
      maxTokens: 150,
      temperature: 0.3
    });

    return {
      content: result.content,
      llmUsage: result.usage
    };
  }

  /**
   * Call LLM service
   */
  private async callLLMService(prompt: string, options: any = {}): Promise<{ content: string; usage: LLMUsage }> {
    // Mock LLM service call
    // In production, this would call the actual LLM API
    
    const mockResponse = {
      content: `Processed: ${prompt.substring(0, 100)}...`,
      usage: {
        provider: this.llmService.provider,
        model: this.llmService.model,
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 50,
        totalTokens: Math.floor(prompt.length / 4) + 50,
        cost: 0.001
      }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return mockResponse;
  }

  /**
   * Build generation prompt
   */
  private buildGenerationPrompt(content: string, config: any): string {
    let prompt = config?.template || 'Please rewrite the following content:';
    
    if (config?.style) {
      prompt += `\nStyle: ${config.style}`;
    }
    
    if (config?.tone) {
      prompt += `\nTone: ${config.tone}`;
    }
    
    prompt += `\n\nContent:\n${content}`;
    
    return prompt;
  }

  /**
   * Clean text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Format text
   */
  private formatText(text: string, options: any = {}): string {
    let formatted = text;

    if (options.lowercase) {
      formatted = formatted.toLowerCase();
    }

    if (options.uppercase) {
      formatted = formatted.toUpperCase();
    }

    if (options.capitalize) {
      formatted = formatted.replace(/\b\w/g, l => l.toUpperCase());
    }

    return formatted;
  }

  /**
   * Extractive summarization (fallback)
   */
  private extractiveSummarization(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 3) {
      return text;
    }

    // Simple extractive summarization - take first and last sentences
    return `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`;
  }

  /**
   * Extract title from content
   */
  private extractTitle(content: string): string {
    const sentences = content.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence;
    }

    return firstSentence?.substring(0, 100) + '...' || 'Untitled';
  }

  /**
   * Generate summary
   */
  private async generateSummary(content: string): Promise<string> {
    // Simple summary generation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return content;
    }

    return sentences.slice(0, 2).join('. ') + '.';
  }

  /**
   * Extract keywords
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Extract tags
   */
  private extractTags(content: string): string[] {
    // Extract hashtags
    const hashtags = content.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.substring(1).toLowerCase());
  }

  /**
   * Classify content
   */
  private classifyContent(content: string): string {
    // Simple content classification
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('news') || lowerContent.includes('report')) {
      return 'news';
    } else if (lowerContent.includes('tutorial') || lowerContent.includes('how to')) {
      return 'tutorial';
    } else if (lowerContent.includes('review') || lowerContent.includes('opinion')) {
      return 'review';
    }
    
    return 'general';
  }

  /**
   * Get transformations applied
   */
  private getTransformations(appliedRules: string[]): string[] {
    return appliedRules.map(rule => `Applied rule: ${rule}`);
  }

  /**
   * Detect language
   */
  private detectLanguage(text: string): string {
    // Simple language detection
    const commonEnglishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const englishWordCount = commonEnglishWords.reduce((count, word) => {
      return count + (text.toLowerCase().split(word).length - 1);
    }, 0);

    return englishWordCount > 2 ? 'en' : 'unknown';
  }

  /**
   * Calculate readability score
   */
  private calculateReadabilityScore(text: string): number {
    // Simple readability score (Flesch Reading Ease approximation)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, score)) / 100; // Normalize to 0-1
  }

  /**
   * Count syllables in text
   */
  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;

    for (const word of words) {
      const syllables = word.match(/[aeiouy]+/g);
      totalSyllables += syllables ? syllables.length : 1;
    }

    return totalSyllables;
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'disappointing'];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      positiveCount += (lowerText.split(word).length - 1);
    });

    negativeWords.forEach(word => {
      negativeCount += (lowerText.split(word).length - 1);
    });

    const totalWords = positiveCount + negativeCount;
    if (totalWords === 0) return 0; // Neutral

    return (positiveCount - negativeCount) / totalWords;
  }

  /**
   * Calculate quality score
   */
  private async calculateQualityScore(content: string, appliedRules: string[]): Promise<QualityScore> {
    const dimensions = [
      {
        name: 'Length',
        score: this.scoreDimension('length', content),
        weight: 0.2,
        description: 'Content length appropriateness'
      },
      {
        name: 'Readability',
        score: this.calculateReadabilityScore(content),
        weight: 0.3,
        description: 'Content readability and clarity'
      },
      {
        name: 'Completeness',
        score: this.scoreDimension('completeness', content),
        weight: 0.3,
        description: 'Content completeness and structure'
      },
      {
        name: 'Processing',
        score: appliedRules.length > 0 ? 1 : 0.5,
        weight: 0.2,
        description: 'Processing rules application'
      }
    ];

    const overall = dimensions.reduce((sum, dim) => sum + (dim.score * dim.weight), 0);

    return {
      overall,
      dimensions,
      issues: [],
      recommendations: this.generateRecommendations(dimensions)
    };
  }

  /**
   * Score individual dimension
   */
  private scoreDimension(dimension: string, content: string): number {
    switch (dimension) {
      case 'length':
        const wordCount = content.split(/\s+/).length;
        if (wordCount < 10) return 0.3;
        if (wordCount < 50) return 0.6;
        if (wordCount < 200) return 1.0;
        if (wordCount < 500) return 0.8;
        return 0.6; // Very long content might be less readable
      
      case 'completeness':
        // Check for basic structure
        const hasSentences = content.includes('.');
        const hasVariety = content.length > 50;
        return (hasSentences ? 0.5 : 0) + (hasVariety ? 0.5 : 0);
      
      default:
        return 0.5;
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(dimensions: any[]): string[] {
    const recommendations: string[] = [];

    dimensions.forEach(dim => {
      if (dim.score < 0.5) {
        switch (dim.name) {
          case 'Length':
            recommendations.push('Consider adjusting content length for better readability');
            break;
          case 'Readability':
            recommendations.push('Simplify language and sentence structure');
            break;
          case 'Completeness':
            recommendations.push('Add more structure and detail to the content');
            break;
          case 'Processing':
            recommendations.push('Apply more processing rules to improve content quality');
            break;
        }
      }
    });

    return recommendations;
  }

  /**
   * Merge LLM usage statistics
   */
  private mergeLLMUsage(existing: LLMUsage | undefined, newUsage: LLMUsage): LLMUsage {
    if (!existing) return newUsage;

    return {
      provider: existing.provider,
      model: existing.model,
      promptTokens: existing.promptTokens + newUsage.promptTokens,
      completionTokens: existing.completionTokens + newUsage.completionTokens,
      totalTokens: existing.totalTokens + newUsage.totalTokens,
      cost: (existing.cost || 0) + (newUsage.cost || 0)
    };
  }
}