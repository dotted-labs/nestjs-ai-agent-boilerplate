import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { TOOLS } from '../tools/tools';
import { ConfigurationSchema, ensureConfiguration } from '../config/configuration';
import { loadChatModel } from '../config/utils';

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State, config: RunnableConfig): Promise<typeof MessagesAnnotation.Update> {
  /** Call the LLM powering our agent. **/
  const configuration = ensureConfiguration(config);

  // Feel free to customize the prompt, model, and other logic!
  const model = (await loadChatModel(configuration.model)).bindTools(TOOLS);
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

// Define a new graph. We use the prebuilt MessagesAnnotation to define state:
// https://langchain-ai.github.io/langgraphjs/concepts/low_level/#messagesannotation
const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
  // Define the two nodes we will cycle between
  .addNode('call_model', callModel)
  .addNode('tools', new ToolNode(TOOLS))
  // Set the entrypoint as `call_model`
  // This means that this node is the first one called
  .addEdge(START, 'call_model')
  .addConditionalEdges(
    // First, we define the edges' source node. We use `call_model`.
    // This means these are the edges taken after the `call_model` node is called.
    'call_model',
    // Next, we pass in the function that will determine the sink node(s), which
    // will be called after the source node is called.
    routeModelOutput,
  )
  // This means that after `tools` is called, `call_model` node is called next.
  .addEdge('tools', 'call_model');

// Initialize a MemorySaver to persist checkpoints between calls
const memory = new MemorySaver();

// Finally, we compile it!
// This compiles it into a graph you can invoke and deploy.
export const graph = workflow.compile({
  checkpointer: memory,
});
graph.name = 'DefaultGraph';
