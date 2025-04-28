import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ConfigurationSchema, ensureConfiguration } from '../config/configuration';
import { loadChatModel } from '../config/utils';
import { TOOLS } from '../tools/tools';
import { retrieverTool } from '../tools/retriever.tool';

// Function to automatically retrieve relevant information for each human message
async function retrieveRelevantDocs(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;

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
  .addNode('retrieve_context', retrieveRelevantDocs)
  .addNode('call_model', callModel)
  .addNode('tools', new ToolNode(TOOLS))
  // Workflow: START -> retrieve_context -> call_model -> (tools or END)
  .addEdge(START, 'retrieve_context')
  .addEdge('retrieve_context', 'call_model')
  .addConditionalEdges('call_model', routeModelOutput)
  // After tools, get context again for the next query
  .addEdge('tools', 'retrieve_context');

// Initialize a MemorySaver to persist checkpoints between calls
const memory = new MemorySaver();

// Compile the graph
export const graph = workflow.compile({
  checkpointer: memory,
});
graph.name = 'AutoRAGGraph';
