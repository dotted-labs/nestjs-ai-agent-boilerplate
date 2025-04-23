import { DynamicTool } from '@langchain/core/tools';
import { SupabaseClient } from '@supabase/supabase-js';

// Define an interface for the filter parameters
interface PublicTenderFilters {
  createdAt?: { from?: string; to?: string };
  updatedAt?: { from?: string; to?: string };
  budget?: { from?: number; to?: number };
  keywords?: string[];
  code?: string;
  dossier?: string;
  limit?: number;
  autonomy?: string;
  organization?: string;
}

export const createPublicTenderTool = (supabase: SupabaseClient) => {
  return new DynamicTool({
    name: 'public_tender_search',
    description: `
      Search for public tenders in the database. 
      You can filter by:
      - Creation and update dates (createdAt, updatedAt)
      - Budget range (from/to)
      - Keywords in title or description
      - Tender code
      - Dossier number
      - Results limit
      - Region/Autonomy
      - Organization

      Input: 
        JSON with optional filters, example:
        {
          "createdAt":{"from":"2023-01-01","to":"2023-12-31"}, 
          "updatedAt":{"from":"2023-01-01"},
          "budget":{"from":1000000, "to": 10000000},
          "keywords": ["licitacion", "contrato"],
          "code": "1234567890",
          "dossier": "1234567890",
          "limit": 20,
          "autonomy": "MADRID",
          "organization": "Universitat de Girona"
        }; 
      Output: 
        array de licitaciones.
      `,
    func: async (filterString: string) => {
      let filters: PublicTenderFilters = {};

      // Parse input if provided
      if (filterString && filterString.trim() !== '') {
        console.log('filterString', filterString);
        try {
          filters = JSON.parse(filterString) as PublicTenderFilters;
        } catch {
          // Ignore parsing error, return specific message
          return 'Error: Los filtros deben estar en formato JSON válido';
        }
      }

      try {
        let query = supabase.from('public_tender').select('*');

        // Apply created_at filter if provided
        if (filters.createdAt) {
          if (filters.createdAt.from) {
            query = query.gte('created_at', filters.createdAt.from);
          }
          if (filters.createdAt.to) {
            query = query.lte('created_at', filters.createdAt.to);
          }
        }

        // Apply budget filter if provided
        if (filters.budget) {
          if (filters.budget.from) {
            query = query.gte('budget', filters.budget.from);
          }
          if (filters.budget.to) {
            query = query.lte('budget', filters.budget.to);
          }
        }

        // Apply updated_at filter if provided
        if (filters.updatedAt) {
          if (filters.updatedAt.from) {
            query = query.gte('updated_at', filters.updatedAt.from);
          }
          if (filters.updatedAt.to) {
            query = query.lte('updated_at', filters.updatedAt.to);
          }
        }

        // Apply keywords filter if provided
        if (filters.keywords) {
          query = query
            .or(`name.ilike.%${filters.keywords.join('%')}%`)
            .or(`summary.ilike.%${filters.keywords.join('%')}%`);
        }

        // Apply code filter if provided
        if (filters.code) {
          query = query.eq('code', filters.code);
        }

        // Apply dossier filter if provided
        if (filters.dossier) {
          query = query.ilike('dossier', `%${filters.dossier}%`);
        }

        // Apply autonomy filter if provided
        if (filters.autonomy) {
          query = query.ilike('autonomy', `%${filters.autonomy}%`);
        }

        // Apply organization filter if provided
        if (filters.organization) {
          query = query.ilike('organization', `%${filters.organization}%`);
        }

        // Apply limit filter if provided
        if (filters.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error al buscar licitaciones:', error);
          return `Error al buscar licitaciones: ${error.message}`;
        }

        return JSON.stringify(data);
      } catch (error) {
        console.error('Error al buscar licitaciones:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        return `Error al buscar licitaciones: ${errorMessage}`;
      }
    },
  });
};
