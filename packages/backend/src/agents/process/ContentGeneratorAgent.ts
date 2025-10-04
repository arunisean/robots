import {
  AgentConfig,
  ProcessedData,
  ProcessAgentConfig,
  ProcessingRule,
  ProcessingType,
  QualityScore,
  ProcessedContent,
  LLMConfig,
  LLMUsage
} from '@multi-agent-platform/shared';
import { ProcessAgent } from './ProcessAgent';
import * as crypto from 'crypto';
import { getErrorMessage } from '../../utils/error-handler';

/**
 * Content Generator Agent
 * Generates new content based on input data using AI and templates
 */
export class ContentGeneratorAgent extends ProcessAgent {
  protected llmService: any = null;
  private processingHistory: any[] = [];
  private contentTemplates: Map<string, string> = new Map();

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, description);
    this.initializeTemplates();
  }

  /**
   * Initialize content generator specific settings
   */
  protected async doInitialize(config: AgentConfig): Promise<void> {
    this.logger.info('Initializing Content Generator Agent');
    
    const processConfig = config as ProcessAgentConfig;
    
    // Initialize processing rules
    if (processConfig.processingRules) {
      this.processingRules = processConfig.processingRules.sort((a, b) => a.order - b.order);
    }

    // Initialize LLM service if configured
    if (processConfig.llmConfig) {
      await this.initializeLLMService(processConfig.llmConfig);
    }

    this.logger.info(`Content generator initialized with ${this.processingRules.length} rules`);
  }

  /**
   * Process content using content generation rules
   */
  protected async processContent(data: any): Promise<ProcessedData> {
    this.logger.info('Generating content');
    
    const startTime = Date.now();
    const appliedRules: string[] = [];
    let generatedContent = '';
    let llmUsage: LLMUsage | undefined;

    try {
      // Extract source content
      const sourceContent = data.content || data.text || data.description || String(data);
      
      // Apply content generation rules
      for (const rule of this.processingRules.filter(r => r.enabled)) {
        try {
          this.logger.debug(`Applying generation rule: ${rule.name}`);
          
          switch (rule.type) {
            case ProcessingType.CONTENT_GENERATION:
              const generationResult = await this.generateContent(sourceContent, rule);
              generatedContent = generationResult.content;
              if (generationResult.llmUsage) {
                llmUsage = this.mergeLLMUsage(llmUsage, generationResult.llmUsage);
              }
              break;
            case ProcessingType.SUMMARIZATION:
              const summaryResult = await this.generateSummary(sourceContent, rule);
              generatedContent = summaryResult.content;
              if (summaryResult.llmUsage) {
                llmUsage = this.mergeLLMUsage(llmUsage, summaryResult.llmUsage);
              }
              break;
            case ProcessingType.TRANSLATION:
              const translationResult = await this.translateContent(sourceContent, rule);
              generatedContent = translationResult.content;
              if (translationResult.llmUsage) {
                llmUsage = this.mergeLLMUsage(llmUsage, translationResult.llmUsage);
              }
              break;
            default:
              this.logger.warn(`Unsupported generation type: ${rule.type}`);
          }
          
          appliedRules.push(rule.name);
        } catch (error) {
          this.logger.error(`Error applying rule ${rule.name}:`, error);
          // Continue with other rules
        }
      }

      // If no content was generated, create default content
      if (!generatedContent) {
        generatedContent = await this.generateDefaultContent(sourceContent);
      }

      const processingTime = Date.now() - startTime;

      // Create processed data
      const processedData: ProcessedData = {
        id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId: data.id || data.sourceId || 'unknown',
        originalData: data,
        processedContent: {
          content: generatedContent,
          title: await this.generateTitle(generatedContent, sourceContent),
          summary: await this.generateContentSummary(generatedContent),
          keywords: this.extractKeywords(generatedContent),
          tags: this.generateTags(generatedContent, sourceContent),
          category: this.classifyGeneratedContent(generatedContent)
        },
        metadata: {
          processingRules: appliedRules,
          processingTime,
          llmUsage,
          transformations: [`Generated content from source: ${sourceContent.substring(0, 100)}...`],
          language: this.detectLanguage(generatedContent),
          readabilityScore: this.calculateReadabilityScore(generatedContent),
          sentimentScore: this.analyzeSentiment(generatedContent)
        },
        qualityScore: await this.calculateQualityScore(generatedContent, sourceContent, appliedRules),
        processedAt: new Date()
      };

      // Record processing history
      this.processingHistory.push({
        id: processedData.id,
        timestamp: new Date(),
        inputSize: sourceContent.length,
        outputSize: generatedContent.length,
        processingTime,
        rulesApplied: appliedRules,
        qualityScore: processedData.qualityScore.overall,
        status: 'success'
      });

      return processedData;
    } catch (error) {
      this.logger.error('Error generating content:', error);
      
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
        errorMessage: getErrorMessage(error)
      });

      throw error;
    }
  }

  /**
   * Perform quality check on generated content
   */
  protected async checkQuality(data: ProcessedData): Promise<ProcessedData> {
    this.logger.info('Performing quality check on generated content');
    
    // Check for minimum content length
    if (data.processedContent.content.length < 50) {
      data.qualityScore.issues.push({
        type: 'content_too_short',
        severity: 'medium',
        description: 'Generated content is too short',
        suggestion: 'Consider using more detailed generation prompts'
      });
    }

    // Check for repetitive content
    if (this.hasRepetitiveContent(data.processedContent.content)) {
      data.qualityScore.issues.push({
        type: 'repetitive_content',
        severity: 'high',
        description: 'Generated content contains repetitive patterns',
        suggestion: 'Adjust generation parameters to reduce repetition'
      });
    }

    // Check for coherence
    if (!this.isCoherent(data.processedContent.content)) {
      data.qualityScore.issues.push({
        type: 'low_coherence',
        severity: 'high',
        description: 'Generated content lacks coherence',
        suggestion: 'Review generation prompts and model parameters'
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
      // Test with a simple generation prompt
      await this.callLLMService('Generate a short test message.', { maxTokens: 20 });
    } catch (error) {
      throw new Error(`LLM service connection failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Agent-specific cleanup logic
   */
  protected async doCleanup(): Promise<void> {
    this.processingHistory = [];
    this.llmService = null;
    this.contentTemplates.clear();
    this.logger.info('Content generator cleanup completed');
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
   * Initialize content templates
   */
  private initializeTemplates(): void {
    this.contentTemplates.set('article', `
# {title}

{introduction}

## Key Points

{main_content}

## Conclusion

{conclusion}
    `.trim());

    this.contentTemplates.set('social_post', `
{hook}

{main_message}

{call_to_action}

{hashtags}
    `.trim());

    this.contentTemplates.set('summary', `
## Summary

{main_points}

**Key Takeaways:**
{takeaways}
    `.trim());

    this.contentTemplates.set('blog_post', `
# {title}

{introduction}

{body_paragraphs}

## Conclusion

{conclusion}

---
*Tags: {tags}*
    `.trim());
  }

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
   * Generate content using rule configuration
   */
  private async generateContent(sourceContent: string, rule: ProcessingRule): Promise<{ content: string; llmUsage?: LLMUsage }> {
    const config = rule.config.contentGeneration;
    
    if (config?.template && this.contentTemplates.has(config.template)) {
      return await this.generateFromTemplate(sourceContent, config.template, config);
    }

    if (this.llmService) {
      return await this.generateWithLLM(sourceContent, config);
    }

    // Fallback to simple content generation
    return {
      content: this.generateSimpleContent(sourceContent, config)
    };
  }

  /**
   * Generate content from template
   */
  private async generateFromTemplate(sourceContent: string, templateName: string, config: any): Promise<{ content: string; llmUsage?: LLMUsage }> {
    const template = this.contentTemplates.get(templateName)!;
    let generatedContent = template;

    // Extract information from source content
    const title = this.extractTitle(sourceContent);
    const summary = this.extractSummary(sourceContent);
    const keywords = this.extractKeywords(sourceContent);

    // Replace template placeholders
    const replacements: { [key: string]: string } = {
      title: title,
      introduction: `Based on the source material, here's an overview of ${title.toLowerCase()}.`,
      main_content: summary,
      conclusion: 'This covers the key aspects of the topic.',
      hook: this.generateHook(sourceContent),
      main_message: summary,
      call_to_action: 'What are your thoughts on this?',
      hashtags: keywords.map(k => `#${k}`).join(' '),
      main_points: this.extractMainPoints(sourceContent),
      takeaways: this.extractTakeaways(sourceContent),
      body_paragraphs: this.generateBodyParagraphs(sourceContent),
      tags: keywords.join(', ')
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      generatedContent = generatedContent.replace(new RegExp(`{${placeholder}}`, 'g'), value);
    }

    // If LLM is available, enhance the generated content
    if (this.llmService && config?.style) {
      const enhancePrompt = `Please enhance the following content in a ${config.style} style:\n\n${generatedContent}`;
      const result = await this.callLLMService(enhancePrompt, { maxTokens: 500 });
      return {
        content: result.content,
        llmUsage: result.usage
      };
    }

    return { content: generatedContent };
  }

  /**
   * Generate content with LLM
   */
  private async generateWithLLM(sourceContent: string, config: any): Promise<{ content: string; llmUsage: LLMUsage }> {
    let prompt = 'Please generate content based on the following source material:\n\n';
    prompt += sourceContent;

    if (config?.style) {
      prompt += `\n\nStyle: ${config.style}`;
    }

    if (config?.tone) {
      prompt += `\nTone: ${config.tone}`;
    }

    if (config?.length) {
      const lengthMap = {
        short: 'Keep it concise (under 100 words)',
        medium: 'Medium length (100-300 words)',
        long: 'Detailed content (300+ words)'
      };
      prompt += `\nLength: ${lengthMap[config.length as keyof typeof lengthMap] || 'Medium length'}`;
    }

    const result = await this.callLLMService(prompt, {
      maxTokens: config?.length === 'short' ? 150 : config?.length === 'long' ? 600 : 400,
      temperature: 0.7
    });

    return {
      content: result.content,
      llmUsage: result.usage
    };
  }

  /**
   * Generate simple content (fallback)
   */
  private generateSimpleContent(sourceContent: string, config: any): string {
    const title = this.extractTitle(sourceContent);
    const summary = this.extractSummary(sourceContent);
    
    let content = `# ${title}\n\n`;
    content += `${summary}\n\n`;
    content += `This content was generated based on the source material provided.`;

    return content;
  }

  /**
   * Generate summary
   */
  private async generateSummary(sourceContent: string, rule: ProcessingRule): Promise<{ content: string; llmUsage?: LLMUsage }> {
    if (this.llmService) {
      const prompt = `Please provide a concise summary of the following content:\n\n${sourceContent}`;
      const result = await this.callLLMService(prompt, { maxTokens: 150, temperature: 0.3 });
      return {
        content: result.content,
        llmUsage: result.usage
      };
    }

    // Fallback to extractive summarization
    return {
      content: this.extractSummary(sourceContent)
    };
  }

  /**
   * Translate content
   */
  private async translateContent(sourceContent: string, rule: ProcessingRule): Promise<{ content: string; llmUsage?: LLMUsage }> {
    const targetLanguage = rule.config.translation?.targetLanguage || 'English';
    
    if (this.llmService) {
      const prompt = `Please translate the following content to ${targetLanguage}:\n\n${sourceContent}`;
      const result = await this.callLLMService(prompt, { maxTokens: sourceContent.length * 2, temperature: 0.1 });
      return {
        content: result.content,
        llmUsage: result.usage
      };
    }

    // Fallback - return original content with note
    return {
      content: `[Translation to ${targetLanguage} not available]\n\n${sourceContent}`
    };
  }

  /**
   * Generate default content
   */
  private async generateDefaultContent(sourceContent: string): Promise<string> {
    const title = this.extractTitle(sourceContent);
    const summary = this.extractSummary(sourceContent);
    
    return `# ${title}\n\n${summary}\n\nThis content was automatically generated from the source material.`;
  }

  /**
   * Generate title
   */
  private async generateTitle(generatedContent: string, sourceContent: string): Promise<string> {
    // Extract title from generated content if it has one
    const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1];
    }

    // Generate title from first sentence
    const firstSentence = generatedContent.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence;
    }

    // Fallback to source title
    return this.extractTitle(sourceContent);
  }

  /**
   * Generate content summary
   */
  private async generateContentSummary(content: string): Promise<string> {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return content;
    }

    return sentences.slice(0, 2).join('. ') + '.';
  }

  /**
   * Generate tags
   */
  private generateTags(generatedContent: string, sourceContent: string): string[] {
    const generatedTags = this.extractKeywords(generatedContent).slice(0, 3);
    const sourceTags = this.extractKeywords(sourceContent).slice(0, 2);
    
    return [...new Set([...generatedTags, ...sourceTags])];
  }

  /**
   * Classify generated content
   */
  private classifyGeneratedContent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('summary') || lowerContent.includes('overview')) {
      return 'summary';
    } else if (lowerContent.includes('tutorial') || lowerContent.includes('how to')) {
      return 'tutorial';
    } else if (lowerContent.includes('news') || lowerContent.includes('update')) {
      return 'news';
    } else if (lowerContent.includes('#') && lowerContent.length < 280) {
      return 'social_post';
    }
    
    return 'article';
  }

  /**
   * Call LLM service
   */
  private async callLLMService(prompt: string, options: any = {}): Promise<{ content: string; usage: LLMUsage }> {
    // Mock LLM service call
    // In production, this would call the actual LLM API
    
    const mockResponse = {
      content: `Generated content based on: ${prompt.substring(0, 100)}...`,
      usage: {
        provider: this.llmService.provider,
        model: this.llmService.model,
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: options.maxTokens || 100,
        totalTokens: Math.floor(prompt.length / 4) + (options.maxTokens || 100),
        cost: 0.002
      }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return mockResponse;
  }

  // Content analysis helper methods

  /**
   * Extract title from content
   */
  private extractTitle(content: string): string {
    const sentences = content.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence;
    }

    return firstSentence?.substring(0, 100) + '...' || 'Generated Content';
  }

  /**
   * Extract summary from content
   */
  private extractSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 3) {
      return content;
    }

    return sentences.slice(0, 3).join('. ') + '.';
  }

  /**
   * Extract keywords
   */
  private extractKeywords(content: string): string[] {
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
      .slice(0, 8)
      .map(([word]) => word);
  }

  /**
   * Generate hook for social content
   */
  private generateHook(content: string): string {
    const hooks = [
      'Did you know that...',
      'Here\'s something interesting:',
      'Quick insight:',
      'Worth noting:',
      'Interesting fact:'
    ];

    return hooks[Math.floor(Math.random() * hooks.length)];
  }

  /**
   * Extract main points
   */
  private extractMainPoints(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const mainPoints = sentences.slice(0, 3).map((sentence, index) => `${index + 1}. ${sentence.trim()}`);
    return mainPoints.join('\n');
  }

  /**
   * Extract takeaways
   */
  private extractTakeaways(content: string): string {
    const keywords = this.extractKeywords(content).slice(0, 3);
    return keywords.map(keyword => `• ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`).join('\n');
  }

  /**
   * Generate body paragraphs
   */
  private generateBodyParagraphs(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs: string[] = [];
    
    for (let i = 0; i < sentences.length; i += 2) {
      const paragraph = sentences.slice(i, i + 2).join('. ') + '.';
      paragraphs.push(paragraph);
      
      if (paragraphs.length >= 3) break;
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Check for repetitive content
   */
  private hasRepetitiveContent(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    
    return uniqueSentences.size < sentences.length * 0.8; // More than 20% repetition
  }

  /**
   * Check content coherence
   */
  private isCoherent(content: string): boolean {
    // Simple coherence check - ensure content has proper structure
    const hasTitle = content.includes('#') || content.split(/[.!?]+/)[0]?.length < 100;
    const hasMultipleSentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length > 1;
    const hasReasonableLength = content.length > 50;
    
    return hasTitle && hasMultipleSentences && hasReasonableLength;
  }

  /**
   * Detect language
   */
  private detectLanguage(text: string): string {
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
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, score)) / 100;
  }

  /**
   * Count syllables
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
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'disappointing', 'poor', 'failed'];

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
    if (totalWords === 0) return 0;

    return (positiveCount - negativeCount) / totalWords;
  }

  /**
   * Calculate quality score for generated content
   */
  private async calculateQualityScore(generatedContent: string, sourceContent: string, appliedRules: string[]): Promise<QualityScore> {
    const dimensions = [
      {
        name: 'Originality',
        score: this.calculateOriginality(generatedContent, sourceContent),
        weight: 0.25,
        description: 'How original the generated content is compared to source'
      },
      {
        name: 'Coherence',
        score: this.isCoherent(generatedContent) ? 1 : 0.3,
        weight: 0.25,
        description: 'Content structure and logical flow'
      },
      {
        name: 'Readability',
        score: this.calculateReadabilityScore(generatedContent),
        weight: 0.25,
        description: 'Content readability and clarity'
      },
      {
        name: 'Completeness',
        score: this.calculateCompleteness(generatedContent),
        weight: 0.25,
        description: 'Content completeness and depth'
      }
    ];

    const overall = dimensions.reduce((sum, dim) => sum + (dim.score * dim.weight), 0);

    return {
      overall,
      dimensions,
      issues: [],
      recommendations: this.generateQualityRecommendations(dimensions)
    };
  }

  /**
   * Calculate originality score
   */
  private calculateOriginality(generated: string, source: string): number {
    const generatedWords = new Set(generated.toLowerCase().split(/\s+/));
    const sourceWords = new Set(source.toLowerCase().split(/\s+/));
    
    const commonWords = new Set([...generatedWords].filter(word => sourceWords.has(word)));
    const originalityRatio = 1 - (commonWords.size / generatedWords.size);
    
    return Math.max(0, Math.min(1, originalityRatio));
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(content: string): number {
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    let score = 0;
    
    // Word count score
    if (wordCount >= 50) score += 0.3;
    if (wordCount >= 100) score += 0.2;
    if (wordCount >= 200) score += 0.2;
    
    // Structure score
    if (sentenceCount >= 3) score += 0.2;
    if (content.includes('#')) score += 0.1; // Has title
    
    return Math.min(1, score);
  }

  /**
   * Generate quality recommendations
   */
  private generateQualityRecommendations(dimensions: any[]): string[] {
    const recommendations: string[] = [];

    dimensions.forEach(dim => {
      if (dim.score < 0.6) {
        switch (dim.name) {
          case 'Originality':
            recommendations.push('Increase creativity and originality in content generation');
            break;
          case 'Coherence':
            recommendations.push('Improve content structure and logical flow');
            break;
          case 'Readability':
            recommendations.push('Simplify language and improve sentence structure');
            break;
          case 'Completeness':
            recommendations.push('Add more detail and depth to the generated content');
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