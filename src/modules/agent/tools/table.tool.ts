import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  RandomTableGeneratorInput,
  RandomTableGeneratorOutput,
} from '../../../types';

const inputSchema = z.object({
  headers: z.array(z.string()).describe('Headers of the table'),
  rows: z.array(z.array(z.string())).describe('Rows of the table'),
});

const outputSchema = z.object({
  dataTable: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
});

export const randomTableGeneratorTool = new DynamicStructuredTool({
  name: 'table_tool',
  description:
    'Generates a data table with headers and rows and returns it in structured format for visualization',
  schema: inputSchema, // automatically validates input
  func: async (input: RandomTableGeneratorInput) => {
    // Return data table format
    return await outputSchema.parseAsync({
      dataTable: {
        headers: input.headers,
        rows: input.rows,
      },
    } as RandomTableGeneratorOutput);
  },
});
