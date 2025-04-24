import { DynamicStructuredTool } from '@langchain/core/tools';
import { ConfigService } from '../../../config/config.service';
import { z } from 'zod';
import FirecrawlApp from '@mendable/firecrawl-js';

export interface WebScraperInput {
  url: string;
}

export interface WebScraperOutput {
  content: string;
}

// Define a type for the success response based on the FirecrawlApp documentation
interface ScrapeSuccessResponse {
  success: true;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Define a type for the error response
interface ScrapeErrorResponse {
  success: false;
  error: string;
}

type ScrapeResponse = ScrapeSuccessResponse | ScrapeErrorResponse;

const inputSchema = z.object({
  url: z.string().url().describe('URL of the website or document to scrape'),
});

const outputSchema = z.object({
  content: z
    .string()
    .describe('The scraped content of the website or document'),
});

export const webScraperTool = (configService: ConfigService) => {
  return new DynamicStructuredTool({
    name: 'web_scraper',
    description:
      'Scrapes content from a website or document using the provided URL',
    schema: inputSchema,
    func: async (input: WebScraperInput) => {
      try {
        const apiKey = configService.firecrawlApiKey;

        // Initialize the Firecrawl client
        const firecrawlClient = new FirecrawlApp({ apiKey });

        // Scrape the website and cast to our type
        const response: ScrapeResponse = await firecrawlClient.scrapeUrl(
          input.url,
        );

        if (!response.success) {
          throw new Error(`Failed to scrape website: ${response.error}`);
        }

        // Extract content from the response
        const content =
          response.markdown ||
          response.html ||
          response.metadata?.description ||
          response.metadata?.title ||
          'No content found';

        return outputSchema.parse({
          content,
        });
      } catch (error: unknown) {
        console.error('Error scraping website:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to scrape website: ${errorMessage}`);
      }
    },
  });
};
