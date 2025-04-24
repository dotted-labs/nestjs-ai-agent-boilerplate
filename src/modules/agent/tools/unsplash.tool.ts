import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';

// --- Input and Output Schemas ---

const inputSchema = z.object({
  query: z.string().describe('The search query for images.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(30) // Unsplash recommends a max of 30 per page
    .optional()
    .default(12)
    .describe('Maximum number of images to return (default 12, max 30).'),
});

const imageSchema = z.object({
  cover: z.string().url().describe('URL of the regular size image.'),
  coverThumb: z.string().url().describe('URL of the thumbnail size image.'),
  user: z.string().describe('Name of the photographer.'),
  url: z.string().url().describe('Link to the image page on Unsplash.'),
});

const outputSchema = z.object({
  images: z
    .array(imageSchema)
    .describe('List of images found matching the query.'),
});

// --- Interfaces ---

export type UnsplashToolInput = z.infer<typeof inputSchema>;
export type UnsplashToolOutput = z.infer<typeof outputSchema>;

// --- Tool Implementation ---

export const unsplashTool = new DynamicStructuredTool({
  name: 'unsplash_image_search',
  description:
    'Searches for images on Unsplash based on a query and returns a list of results.',
  schema: inputSchema,
  func: async (input: UnsplashToolInput): Promise<UnsplashToolOutput> => {
    try {
      const accessKey = process.env.UNSPLASH_ACCESS_KEY;
      const baseUrl = 'https://api.unsplash.com/search/photos';
      const params = {
        query: input.query,
        per_page: input.limit,
        page: 1, // Fetch the first page
        client_id: accessKey,
      };

      const response = await axios.get<{ results: any[] }>(baseUrl, { params });

      // Check for API errors (though Unsplash often returns 200 even for issues)
      // A more robust check might involve looking at response headers or specific error formats if needed.

      const images = response.data.results.map((result: any) => ({
        cover: result.urls.regular,
        coverThumb: result.urls.thumb,
        user: result.user.name,
        url: result.links.html,
      }));

      // Handle case where no results are found (returning empty for now, matching API)
      // You could add fallback logic here if needed, like the random image in your example.

      return outputSchema.parse({
        images,
      });
    } catch (error: unknown) {
      console.error('Error searching Unsplash:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error fetching images';
      // Improve error message for missing key
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error(
          `Failed to search Unsplash: Unauthorized. Check your UNSPLASH_ACCESS_KEY.`,
        );
      }
      throw new Error(`Failed to search Unsplash: ${errorMessage}`);
    }
  },
});
