/**
 * Interfaces for chat model stream data
 */

export interface ChatModelStreamData {
  chunk?: {
    content?: string;
  };
}

export interface ToolStartData {
  tool_name?: string;
  // Add other relevant properties if needed
}

export interface ToolEndData {
  output?: unknown; // Use unknown instead of any
  // Add other relevant properties if needed
}

export interface StreamEventData {
  event: string;
  data: ChatModelStreamData | ToolStartData | ToolEndData;
  // Add other common properties like 'name', 'run_id' if needed
}
