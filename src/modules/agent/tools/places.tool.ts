import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';

// --- Input and Output Schemas ---

const inputSchema = z.object({
  latitude: z.number().describe('Latitude of the center point for the search.'),
  longitude: z
    .number()
    .describe('Longitude of the center point for the search.'),
  radius: z
    .number()
    .min(1)
    .max(50000)
    .describe('Search radius in meters (max 50000).'),
  query: z
    .string()
    .optional()
    .describe(
      'Keywords to filter place types (e.g., "restaurant", "museum", "park", "monument").',
    ),
});

const placeSchema = z.object({
  name: z.string().describe('Name of the place.'),
  address: z.string().optional().describe('Address of the place.'),
  types: z
    .array(z.string())
    .optional()
    .describe('Categories describing the place.'),
  rating: z.number().optional().describe('Place rating (1.0 to 5.0).'),
  user_ratings_total: z
    .number()
    .optional()
    .describe('Total number of user ratings.'),
});

const outputSchema = z.object({
  places: z
    .array(placeSchema)
    .describe('List of places found near the coordinates.'),
});

// --- Interfaces ---

export type PlacesToolInput = z.infer<typeof inputSchema>;
export type PlacesToolOutput = z.infer<typeof outputSchema>;

// --- Tool Implementation ---

export const placesTool = new DynamicStructuredTool({
  name: 'google_maps_places_finder',
  description:
    'Finds places of interest (like restaurants, museums, parks, monuments) near specific geographic coordinates using Google Maps Places API.',
  schema: inputSchema,
  func: async (input: PlacesToolInput): Promise<PlacesToolOutput> => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const baseUrl =
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

      const params = {
        location: `${input.latitude},${input.longitude}`,
        radius: input.radius,
        key: apiKey,
        keyword: input.query, // Use 'keyword' for broader filtering based on query
      };

      // Remove keyword if not provided
      if (!params.keyword) {
        delete params.keyword;
      }

      const response = await axios.get(baseUrl, { params });

      if (
        response.data.status !== 'OK' &&
        response.data.status !== 'ZERO_RESULTS'
      ) {
        throw new Error(
          `Google Maps API Error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`,
        );
      }

      const places = response.data.results.map((place: any) => ({
        name: place.name,
        address: place.vicinity,
        types: place.types,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
      }));

      return outputSchema.parse({
        places,
      });
    } catch (error: unknown) {
      console.error('Error searching for places:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error fetching places';
      throw new Error(`Failed to search for places: ${errorMessage}`);
    }
  },
});
