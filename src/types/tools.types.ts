/**
 * Types for tool inputs and outputs
 */

// Random Table Generator Tool
export interface RandomTableGeneratorInput {
  headers: string[];
  rows: string[][];
}

export interface DataTableRow {
  headers: string[];
  rows: string[][];
}

export interface RandomTableGeneratorOutput {
  dataTable: DataTableRow;
}
