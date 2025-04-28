import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ConfigurationSchema, ensureConfiguration } from '../config/configuration';
import { loadChatModel } from '../config/utils';
import { TOOLS } from '../tools/tools';
import { retrieverTool } from '../tools/retriever.tool';

// Define the function that calls the model with context enhancement
async function callModel(state: typeof MessagesAnnotation.State, config: RunnableConfig): Promise<typeof MessagesAnnotation.Update> {
  /** Call the LLM powering our agent. **/
  const configuration = ensureConfiguration(config);

  // Feel free to customize the prompt, model, and other logic!
  const model = (await loadChatModel(configuration.model)).bindTools([retrieverTool]);
  const sys = configuration.systemPromptTemplate.replace('{system_time}', new Date().toISOString());
  const response = await model.invoke([{ role: 'system', content: sys }, ...state.messages]);

  // We return a list, because this will get added to the existing list
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

// Define a new graph. We use the prebuilt MessagesAnnotation to define state
const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
  // Define the nodes in our RAG workflow
  .addNode('call_model', callModel)
  .addNode('tools', new ToolNode(TOOLS))
  // Set the entrypoint - from START we call the model (which will internally retrieve context)
  .addEdge(START, 'call_model')
  .addConditionalEdges(
    // Route based on model output
    'call_model',
    routeModelOutput,
  )
  // After tools execution, call the model again
  .addEdge('tools', 'call_model');

// Initialize a MemorySaver to persist checkpoints between calls
const memory = new MemorySaver();

// Finally, we compile it!
// This compiles it into a graph you can invoke and deploy.
export const graph = workflow.compile({
  checkpointer: memory,
});
graph.name = 'RAGGraph';
