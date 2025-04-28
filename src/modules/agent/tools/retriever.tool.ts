import { DynamicStructuredTool } from '@langchain/core/tools';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*                               Input Schema                                 */
/* -------------------------------------------------------------------------- */

const RetrieverToolInputSchema = z.object({
  query: z.string().describe('The search query to find relevant documents in the vector database.'),
  limit: z.number().optional().default(5).describe('Maximum number of documents to retrieve.'),
  filter: z.record(z.any()).optional().describe('Optional metadata filters to apply to the search.'),
});

/* -------------------------------------------------------------------------- */
/*                               Output Schema                                */
/* -------------------------------------------------------------------------- */

const DocumentSchema = z.object({
  id: z.string().optional().describe('Document identifier if available.'),
  content: z.string().describe('The document content or text.'),
  metadata: z.record(z.any()).describe('Additional metadata associated with the document.'),
  score: z.number().optional().describe('Similarity score of the document to the query.'),
});

const RetrieverToolOutputSchema = z.object({
  documents: z.array(DocumentSchema).describe('List of relevant documents retrieved from the database.'),
  totalFound: z.number().describe('Total number of documents found in the search.'),
});

/* -------------------------------------------------------------------------- */
/*                                 Interfaces                                 */
/* -------------------------------------------------------------------------- */

export type RetrieverToolInput = z.infer<typeof RetrieverToolInputSchema>;
export type RetrieverToolOutput = z.infer<typeof RetrieverToolOutputSchema>;

/* -------------------------------------------------------------------------- */
/*                           Tool Implementation                              */
/* -------------------------------------------------------------------------- */

export const retrieverTool = new DynamicStructuredTool({
  name: 'supabase_retriever',
  description:
    'Searches for relevant documents in a Supabase vector database based on a query. Use this tool when you need to retrieve information from the knowledge base.',
  schema: RetrieverToolInputSchema,

  func: async (input: RetrieverToolInput): Promise<RetrieverToolOutput> => {
    try {
      /* -------------------------------------------------------------------------- */
      /*                                   Setup                                    */
      /* -------------------------------------------------------------------------- */
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
      }

      // Initialize Supabase client
      const client = createClient(supabaseUrl, supabaseKey);

      // Initialize OpenAI embeddings (assumes OpenAI API key is set as OPENAI_API_KEY env var)
      const embeddings = new OpenAIEmbeddings();

      /* -------------------------------------------------------------------------- */
      /*                        Initialize Vector Store                             */
      /* -------------------------------------------------------------------------- */
      const vectorStore = new SupabaseVectorStore(embeddings, {
        client,
        tableName: 'documents', // Default table name, adjust as needed
        queryName: 'match_documents', // Default query name, adjust as needed
      });

      /* -------------------------------------------------------------------------- */
      /*                          Perform Similarity Search                         */
      /* -------------------------------------------------------------------------- */
      console.log(`Searching for documents with query: "${input.query}"`);

      // Perform the search with or without filters
      const results = input.filter
        ? await vectorStore.similaritySearch(input.query, input.limit, input.filter)
        : await vectorStore.similaritySearch(input.query, input.limit);

      /* -------------------------------------------------------------------------- */
      /*                            Process Results                                 */
      /* -------------------------------------------------------------------------- */
      // Map the results to the expected output format
      const documents = results.map((doc, index) => ({
        id: doc.metadata?.id || `result-${index}`,
        content: doc.pageContent,
        metadata: doc.metadata || {},
        score: doc.metadata?.score,
      }));

      return RetrieverToolOutputSchema.parse({
        documents,
        totalFound: documents.length,
      });
    } catch (error: unknown) {
      /* -------------------------------------------------------------------------- */
      /*                              Error Handling                                */
      /* -------------------------------------------------------------------------- */
      console.error('Error executing supabase_retriever:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Document retrieval failed: ${errorMessage}`);
    }
  },
});

// Export schemas if needed elsewhere
export { RetrieverToolInputSchema, RetrieverToolOutputSchema };
