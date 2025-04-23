import { DynamicTool } from '@langchain/core/tools';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '../config/config.service';

interface TenderData {
  id: number;
  [key: string]: unknown;
}

interface DocumentData {
  id: number;
  [key: string]: unknown;
}

interface SqlData {
  tender?: TenderData;
  document?: DocumentData;
}

interface DocumentMetadata {
  tender_id?: number;
  document_id?: number;
  [key: string]: unknown;
}

interface Document {
  pageContent: string;
  metadata: DocumentMetadata;
}

export const createVectorSearchTool = (
  supabase: SupabaseClient,
  configService: ConfigService,
) => {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: configService.openAiApiKey,
    modelName: 'text-embedding-3-small', // Or configService.embeddingModel if available
  });

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: 'documents_content',
    queryName: 'match_documents_content',
  });

  return new DynamicTool({
    name: 'vector_search',
    description:
      'Searches in the vector database knowledge base for information relevant to the question. Input: query string, or JSON like {"query": "string", "k": number}; Output: array of matching documents.',
    func: async (input: string) => {
      let query: string;
      let k = 5; // Default value

      // Attempt to parse input as JSON to support optional k
      try {
        const parsedInput: unknown = JSON.parse(input);
        if (
          typeof parsedInput === 'object' &&
          parsedInput !== null &&
          'query' in parsedInput &&
          typeof parsedInput.query === 'string'
        ) {
          query = parsedInput.query;
          if ('k' in parsedInput && typeof parsedInput.k === 'number') {
            k = parsedInput.k;
          }
        } else {
          // Assume input is just the query string if parsing fails or format is wrong
          query = input;
        }
      } catch {
        // Input is likely just the query string
        query = input;
      }

      try {
        const results = await vectorStore.similaritySearch(query, k);

        // Collect all tender and document IDs from the results
        const tenderIds: number[] = [];
        const documentIds: number[] = [];

        results.forEach((doc: Document) => {
          const tenderId = doc.metadata.tender_id;
          const documentId = doc.metadata.document_id;

          if (typeof tenderId === 'number' && !tenderIds.includes(tenderId)) {
            tenderIds.push(tenderId);
          }

          if (
            typeof documentId === 'number' &&
            !documentIds.includes(documentId)
          ) {
            documentIds.push(documentId);
          }
        });

        // Fetch all tenders and documents in a single query each
        const tendersMap: Record<number, TenderData> = {};
        const documentsMap: Record<number, DocumentData> = {};

        // Only fetch tenders if we have any tender IDs
        if (tenderIds.length > 0) {
          const { data: tendersData, error: tendersError } = await supabase
            .from('public_tender')
            .select('*')
            .in('id', tenderIds);

          if (tendersError) {
            console.error('Error fetching tenders data:', tendersError);
          } else if (tendersData) {
            // Create a map of tender ID to tender data
            tendersData.forEach((tender: TenderData) => {
              tendersMap[tender.id] = tender;
            });
          }
        }

        // Only fetch documents if we have any document IDs
        if (documentIds.length > 0) {
          const { data: documentsData, error: documentsError } = await supabase
            .from('documents')
            .select('*')
            .in('id', documentIds);

          if (documentsError) {
            console.error('Error fetching documents data:', documentsError);
          } else if (documentsData) {
            // Create a map of document ID to document data
            documentsData.forEach((document: DocumentData) => {
              documentsMap[document.id] = document;
            });
          }
        }

        // Map the results and add the SQL data
        const formattedResults = results.map((doc: Document) => {
          const baseResult = {
            content: doc.pageContent,
            metadata: doc.metadata,
          };

          const tenderId = doc.metadata.tender_id;
          const documentId = doc.metadata.document_id;

          // Only add SQL data if we have any
          if (typeof tenderId === 'number' || typeof documentId === 'number') {
            const additionalData: SqlData = {};

            if (typeof tenderId === 'number' && tendersMap[tenderId]) {
              additionalData.tender = tendersMap[tenderId];
            }

            if (typeof documentId === 'number' && documentsMap[documentId]) {
              additionalData.document = documentsMap[documentId];
            }

            return {
              ...baseResult,
              sql_data: additionalData,
            };
          }

          return baseResult;
        });

        console.log('formattedResults', formattedResults);

        return JSON.stringify(formattedResults);
      } catch (error) {
        console.error('Error searching vector database:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to search knowledge base';
        return `Error: ${errorMessage}`;
      }
    },
  });
};
