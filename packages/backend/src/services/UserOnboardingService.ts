import { WorkflowRepository } from '../database/repositories';
import { Logger } from '../utils/logger';
import { CreateWorkflowDto } from '@multi-agent-platform/shared';

/**
 * Service for handling user onboarding
 * Creates sample workflows for new users
 */
export class UserOnboardingService {
  private workflowRepo: WorkflowRepository;
  private logger: Logger;

  constructor(workflowRepo: WorkflowRepository) {
    this.workflowRepo = workflowRepo;
    this.logger = new Logger('UserOnboardingService');
  }

  /**
   * Create sample workflows for a new user
   */
  async createSampleWorkflows(userId: string): Promise<void> {
    this.logger.info(`Creating sample workflows for user ${userId}`);

    try {
      // Check if user already has workflows
      const existingWorkflows = await this.workflowRepo.findByOwner(userId);
      if (existingWorkflows.length > 0) {
        this.logger.debug(`User ${userId} already has workflows, skipping sample creation`);
        return;
      }

      // Create sample workflows
      const sampleWorkflows: CreateWorkflowDto[] = [
        {
          name: 'Tech News to Twitter',
          description: 'Automatically scrape tech news and post summaries to Twitter',
          version: '1.0.0',
          definition: {
            nodes: [
              {
                id: 'scraper-1',
                type: 'work.web_scraper',
                category: 'WORK',
                order: 1,
                config: {
                  id: 'scraper-1',
                  name: 'HN Scraper',
                  category: 'WORK',
                  dataSources: [{
                    id: 'hn-source',
                    type: 'WEB_SCRAPING',
                    url: 'https://news.ycombinator.com',
                    selectors: {
                      title: '.titleline > a',
                      url: '.titleline > a::attr(href)',
                      points: '.score'
                    },
                    pagination: {
                      enabled: false
                    }
                  }],
                  resources: {
                    memory: 256,
                    cpu: 0.5,
                    timeout: 300
                  }
                }
              },
              {
                id: 'processor-1',
                type: 'process.text_processor',
                category: 'PROCESS',
                order: 2,
                config: {
                  id: 'processor-1',
                  name: 'Content Summarizer',
                  category: 'PROCESS',
                  processingRules: [{
                    name: 'summarize-news',
                    type: 'CONTENT_GENERATION',
                    order: 1,
                    enabled: true,
                    config: {
                      contentGeneration: {
                        style: 'casual',
                        tone: 'neutral',
                        length: 'short'
                      }
                    }
  