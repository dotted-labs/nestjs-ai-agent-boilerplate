import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';

// --- Input Schema ---
const WeatherToolInputSchema = z.object({
  city: z
    .string()
    .describe('The name of the city to get weather information for.'),
});

// --- Output Schema ---
const WeatherDataSchema = z.object({
  temperature: z.number().describe('Current temperature in Celsius.'),
  condition: z
    .string()
    .describe('Weather condition (e.g., Sunny, Cloudy, Rainy).'),
  humidity: z.number().describe('Humidity percentage.'),
  windSpeed: z.number().describe('Wind speed in km/h.'),
  location: z
    .string()
    .describe('Location name returned by the weather service.'),
});

const WeatherToolOutputSchema = z.object({
  weather: WeatherDataSchema.describe(
    'Weather information for the requested city.',
  ),
  timestamp: z
    .string()
    .describe('Timestamp when the weather data was retrieved.'),
});

// --- Interfaces ---
export type WeatherToolInput = z.infer<typeof WeatherToolInputSchema>;
export type WeatherToolOutput = z.infer<typeof WeatherToolOutputSchema>;

// --- Tool Implementation ---
export const weatherTool = new DynamicStructuredTool({
  name: 'get_weather',
  description: 'Get current weather information for a specific city.',
  schema: WeatherToolInputSchema,

  func: async (input: WeatherToolInput): Promise<WeatherToolOutput> => {
    try {
      // --- Setup ---
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Weather API key is missing. Set WEATHER_API_KEY environment variable.',
        );
      }

      // --- API Call ---
      // Using weatherapi.com as an example - you'll need to sign up for an API key
      const baseUrl = 'http://api.weatherapi.com/v1/current.json';

      const response = await axios.get(baseUrl, {
        params: {
          key: apiKey,
          q: input.city,
          aqi: 'no',
        },
      });

      if (response.status !== 200 || !response.data) {
        throw new Error(
          `Weather API request failed with status ${response.status}`,
        );
      }

      // --- Process Results ---
      const weatherData = response.data;

      const outputData: WeatherToolOutput = {
        weather: {
          temperature: weatherData.current.temp_c,
          condition: weatherData.current.condition.text,
          humidity: weatherData.current.humidity,
          windSpeed: weatherData.current.wind_kph,
          location: `${weatherData.location.name}, ${weatherData.location.country}`,
        },
        timestamp: new Date().toISOString(),
      };

      return WeatherToolOutputSchema.parse(outputData);
    } catch (error: unknown) {
      console.error(`Error executing weather tool:`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Weather tool execution failed: ${errorMessage}`);
    }
  },
});
