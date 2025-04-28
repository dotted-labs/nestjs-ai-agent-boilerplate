import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { ConfigurationSchema, ensureConfiguration } from '../config/configuration';
import { loadChatModel } from '../config/utils';
import { TOOLS } from '../tools/tools';
import { retrieverTool } from '../tools/retriever.tool';

// Define a schema for router response
const RouterSchema = z.object({
  logic: z.string(),
  type: z.enum(['retrieval', 'general', 'tool']),
});

// Global router for controlling the flow
let currentRouter = { type: 'general', logic: 'Initial state' };

// Function to analyze query and determine if retrieval is needed
async function analyzeQuery(state: typeof MessagesAnnotation.State, config: RunnableConfig) {
  const messages = state.messages;

  // Empty or no messages
  if (!messages || messages.length === 0) {
    currentRouter = { type: 'general', logic: 'No messages to process' };
    return { messages: [] };
  }

  const lastMessage = messages[messages.length - 1];

  // Only analyze human messages
  if (!(lastMessage instanceof HumanMessage)) {
    currentRouter = { type: 'general', logic: 'Not a human message' };
    return { messages: [] };
  }

  const configuration = ensureConfiguration(config);
  const model = await loadChatModel(configuration.model);

  // Prepare system prompt for query classification
  const routerSystemPrompt = `You are a query classifier. Analyze the user's message and determine if it requires:
  1. Retrieval of documents from the database ("retrieval")
  2. Use of specialized tools ("tool")
  3. General knowledge or conversation ("general")
  
  Choose the most appropriate type.`;

  // Call model to classify the query
  const modelResponse = await model
    .withStructuredOutput(RouterSchema)
    .invoke([{ role: 'system', content: routerSystemPrompt }, lastMessage]);

  // Update the global router
  currentRouter = modelResponse;

  return { messages: [] };
}

// Function to automatically retrieve relevant documents when needed
async function retrieveRelevantDocs(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;

  // Only retrieve if router indicates retrieval is needed
  if (currentRouter.type !== 'retrieval') {
    return { messages: [] };
  }

  // Empty or no messages
  if (!messages || messages.length === 0) {
    return { messages: [] };
  }

  const lastMessage = messages[messages.length - 1];

  // Only retrieve for human messages
  if (!(lastMessage instanceof HumanMessage)) {
    return { messages: [] };
  }

  try {
    // Use the last human message as the search query
    // Check if content is a string, otherwise convert it to string
    const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    // Use our existing retrieval tool
    const result = await retrieverTool.invoke({ query, limit: 5 });

    // Format results as a system message with context
    if (result.documents && result.documents.length > 0) {
      const contextText = result.documents
        .map((doc) => `Document: ${doc.metadata.title || 'Untitled'}\n${doc.content}`)
        .join('\n\n---\n\n');

      // Add a system message with context right after the human message
      return {
        messages: [
          {
            role: 'system',
            content: `Here is relevant information to help answer the user's question:\n\n${contextText}`,
          },
        ],
      };
    }
  } catch (error) {
    console.error('Error retrieving context:', error);
  }

  // If we got here, either retrieval failed or no documents were found
  return { messages: [] };
}

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State, config: RunnableConfig) {
  /** Call the LLM powering our agent. **/
  const configuration = ensureConfiguration(config);

  // Model loaded without tools binding since context is already provided
  const model = await loadChatModel(configuration.model);

  // System prompt without modification to include context (as context is now a message)
  const sys = configuration.systemPromptTemplate.replace('{system_time}', new Date().toISOString());

  const response = await model.invoke([{ role: 'system', content: sys }, ...state.messages]);

  // Return just the model's response
  return { messages: [response] };
}

// Define the function that determines whether to continue or not
function routeModelOutput(state: typeof MessagesAnnotation.State): string {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  // If the LLM is invoking tools, route there.
  if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
    return 'tools';
  }
  // Otherwise end the graph.
  else {
    return END;
  }
}

// Define a new graph using the standard MessagesAnnotation
const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
  // Define the nodes in our RAG workflow
  .addNode('analyze_query', analyzeQuery)
  .addNode('retrieve_context', retrieveRelevantDocs)
  .addNode('call_model', callModel)
  .addNode('tools', new ToolNode(TOOLS))
  // Workflow: START -> analyze_query -> retrieve_context -> call_model -> (tools or END)
  .addEdge(START, 'analyze_query')
  .addEdge('analyze_query', 'retrieve_context')
  .addEdge('retrieve_context', 'call_model')
  .addConditionalEdges('call_model', routeModelOutput)
  // After tools, analyze the query again for the next interaction
  .addEdge('tools', 'analyze_query');

// Initialize a MemorySaver to persist checkpoints between calls
const memory = new MemorySaver();

// Compile the graph
export const graph = workflow.compile({
  checkpointer: memory,
});
graph.name = 'AdaptiveRAGGraph';
