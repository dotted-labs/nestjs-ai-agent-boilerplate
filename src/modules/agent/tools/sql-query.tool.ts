// import { DynamicTool } from '@langchain/core/tools';
// import { SupabaseClient } from '@supabase/supabase-js';

// // Helper function to check if the query is safe (only SELECT)
// const isSelectQuery = (query: string): boolean => {
//   const normalizedQuery = query.trim().toLowerCase();
//   return (
//     normalizedQuery.startsWith('select') &&
//     !normalizedQuery.includes('insert') &&
//     !normalizedQuery.includes('update') &&
//     !normalizedQuery.includes('delete') &&
//     !normalizedQuery.includes('drop') &&
//     !normalizedQuery.includes('alter') &&
//     !normalizedQuery.includes('create')
//   );
// };

// export const createSqlQueryTool = (supabase: SupabaseClient) => {
//   return new DynamicTool({
//     name: 'SQLQuery',
//     description:
//       'Executes safe SQL SELECT queries on the application database to retrieve structured data. Input: query string; Output: query results as JSON string or error message.',
//     func: async (queryText: string): Promise<string> => {
//       try {
//         if (!isSelectQuery(queryText)) {
//           return 'Error: Only SELECT queries are allowed';
//         }

//         // Use a generic PostgREST function call for safety
//         // Provide a generic type for the expected data structure if known,
//         // otherwise use `unknown` or `any` if structure is truly variable.
//         const { data, error } = await supabase.rpc('execute_safe_query', {
//           query_text: queryText,
//         });

//         if (error) {
//           console.error('Error executing SQL query:', error);
//           return `Error executing SQL query: ${error.message}`;
//         }

//         return JSON.stringify(data);
//       } catch (error) {
//         console.error('Error executing SQL query:', error);
//         const errorMessage = error instanceof Error ? error.message : 'Failed to execute SQL query';
//         return `Error: ${errorMessage}`;
//       }
//     },
//   });
// };
