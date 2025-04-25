/* -------------------------------------------------------------------------- */
/*                            Tool Template File                              */
/* -------------------------------------------------------------------------- */
// This template provides a standardized structure for creating new tools in the agent system.
// Tools are specialized functions that allow the AI agent to interact with external systems,
// retrieve information, or perform specific operations.
//
// How to use this template:
// 1. Duplicate this file and rename it to reflect your tool's purpose (e.g., weather.tool.ts)
// 2. Define your input schema using Zod to specify what parameters your tool accepts
// 3. Define your output schema to ensure consistent return data structure
// 4. Implement the tool's core functionality in the execute function
// 5. Export your tool and register it in the agent configuration (see agent.ts)
//
// IMPORTANT:
// - Each tool should have a clear, single responsibility
// - Provide detailed descriptions for all parameters to help the AI understand when to use the tool
// - Handle errors gracefully and return informative error messages
// - Consider rate limits and performance when making external API calls

// Import any necessary external libraries or modules (e.g., axios for HTTP requests)
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*                               Input Schema                                 */
/* -------------------------------------------------------------------------- */

// Define the expected input structure for your tool using Zod.
// This provides runtime validation and type safety.
// Use .describe() to add descriptions for each field, which Langchain can use.
const ToolInputSchema = z.object({
  // Add input fields specific to your tool
  // Example:
  // query: z.string().describe('The search query or input text.'),
  // count: z.number().optional().default(10).describe('Maximum number of results.'),
  param1: z.string().describe('Description for parameter 1.'),
  param2: z.number().optional().describe('Description for parameter 2.'),
});

/* -------------------------------------------------------------------------- */
/*                               Output Schema                                */
/* -------------------------------------------------------------------------- */

// Define the expected output structure for your tool using Zod.
// This helps ensure the tool returns data in a consistent format.

// (Optional) Define a schema for individual items if the output is a list
const ToolResultItemSchema = z.object({
  // Define fields for each item in the result list
  // Example:
  // title: z.string().describe('The title of the result item.'),
  // snippet: z.string().describe('A short summary or snippet.'),
  id: z.string().describe('Unique identifier for the result.'),
  data: z.any().describe('Relevant data for the result.'),
});

const ToolOutputSchema = z.object({
  // Define the top-level output fields
  // Example: Use an array of the item schema for lists
  // results: z.array(ToolResultItemSchema).describe('List of results found.'),
  results: z
    .array(ToolResultItemSchema)
    .describe('List of items returned by the tool.'),
  // Or define other output fields as needed
  // summary: z.string().optional().describe('A summary of the operation.'),
});

/* -------------------------------------------------------------------------- */
/*                                 Interfaces                                 */
/* -------------------------------------------------------------------------- */

// Define TypeScript interfaces inferred from the Zod schemas.
// These provide static type checking during development.
export type ToolInput = z.infer<typeof ToolInputSchema>;
export type ToolOutput = z.infer<typeof ToolOutputSchema>;

/* -------------------------------------------------------------------------- */
/*                           Tool Implementation                              */
/* -------------------------------------------------------------------------- */

// Create an instance of DynamicStructuredTool.
export const genericTool = new DynamicStructuredTool({
  // --- Configuration ---
  name: 'your_tool_name', // Choose a unique, descriptive name for the tool (used by the AI model).
  description: 'Describe what your tool does clearly and concisely.', // Explain the tool's purpose (used by the AI model).
  schema: ToolInputSchema, // Assign the input schema defined above.

  // --- Core Logic ---
  // The main function that executes the tool's logic.
  // It receives the validated input (matching ToolInput type) and must return a promise resolving to the output (matching ToolOutput type).
  func: async (input: ToolInput): Promise<ToolOutput> => {
    try {
      /* -------------------------------------------------------------------------- */
      /*                             1. Setup (Optional)                            */
      /* -------------------------------------------------------------------------- */
      // Retrieve API keys or configuration from environment variables or config services.
      // const apiKey = process.env.YOUR_API_KEY_ENV_VAR;
      // if (!apiKey) {
      //   throw new Error('API key is missing. Set YOUR_API_KEY_ENV_VAR environment variable.');
      // }
      // const baseUrl = 'https://api.example.com/endpoint';

      /* -------------------------------------------------------------------------- */
      /*                        2. Prepare Request (If applicable)                  */
      /* -------------------------------------------------------------------------- */
      // Construct parameters or request body for an external API call based on the input.
      // const params = {
      //   query: input.query,
      //   limit: input.count,
      //   apiKey: apiKey,
      // };

      /* -------------------------------------------------------------------------- */
      /*                            3. Execute Core Logic                           */
      /* -------------------------------------------------------------------------- */
      // Implement the main functionality here.
      // This might involve calling external APIs, interacting with databases, or performing calculations.
      console.log('Executing tool logic with input:', input);

      // Example: Making an API call
      // const response = await axios.get(baseUrl, { params });
      // if (response.status !== 200 || !response.data) {
      //   throw new Error(`API request failed with status ${response.status}`);
      // }
      // const apiData = response.data;

      // Placeholder logic: Replace with actual implementation
      const processedResults = [
        { id: 'item1', data: `Processed data for ${input.param1}` },
        { id: 'item2', data: `Another item based on ${input.param1}` },
      ];
      // ---

      /* -------------------------------------------------------------------------- */
      /*                             4. Process Results                             */
      /* -------------------------------------------------------------------------- */
      // Map or transform the data received from the core logic into the structure defined by ToolOutputSchema.
      // Ensure all required fields in the output schema are populated.
      const outputData = {
        results: processedResults.map((item: any) => ({
          // Map raw data to the ToolResultItemSchema structure
          id: item.id,
          data: item.data,
          // Add other fields as defined in ToolResultItemSchema
        })),
        // Add other fields as defined in ToolOutputSchema
        // summary: `Successfully processed ${processedResults.length} items.`,
      };

      /* -------------------------------------------------------------------------- */
      /*                        5. Validate and Return Output                       */
      /* -------------------------------------------------------------------------- */
      // Use the output schema's parse method to validate the final data before returning.
      // This ensures the output conforms to the expected structure.
      return ToolOutputSchema.parse(outputData);
    } catch (error: unknown) {
      /* -------------------------------------------------------------------------- */
      /*                              Error Handling                                */
      /* -------------------------------------------------------------------------- */
      // Implement robust error handling. Log the error for debugging.
      console.error(`Error executing ${genericTool.name}:`, error);

      // Re-throw a more specific error message to provide context to the caller (e.g., the AI model).
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Tool execution failed: ${errorMessage}`);
      // Consider wrapping the original error if more details are needed downstream:
      // throw new Error(`Tool execution failed: ${errorMessage}`, { cause: error });
    }
  },
});

// --- Optional: Export Schemas/Types if needed elsewhere ---
// export { ToolInputSchema, ToolOutputSchema };
