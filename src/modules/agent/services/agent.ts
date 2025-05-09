import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

// Import the random table generator tool
import { randomTableGeneratorTool } from '../tools/table.tool';
import { placesTool, weatherTool } from '../tools';
import { unsplashTool } from '../tools/unsplash.tool';
import { ConfigService } from '../../../config/config.service';

export const createAgent = (
  modelName: string,
  openAIApiKey: string,
  configService: ConfigService,
  systemPrompt: string,
) => {
  // Language model configuration (OpenAI GPT-4 in this example).
  // It's assumed that OPENAI_API_KEY is defined in the environment variables.
  const llm = new ChatOpenAI({
    modelName,
    openAIApiKey,
    temperature: 0.7, // Generation temperature (adjustable as needed)
  });

  // Initialize a memory saver to preserve conversation history.
  const memory = new MemorySaver();
  // 1) Create a prompt that lists the tools and explains how to call them

  /**
   * AI Agent built with LangGraph.js.
   * - Includes the randomTableGeneratorTool to generate random data.
   * - Uses MemorySaver as checkpointSaver to maintain context by thread.
   */
  return createReactAgent({
    llm,
    tools: [randomTableGeneratorTool, placesTool, unsplashTool, weatherTool],
    checkpointSaver: memory,
    // (Optionally, an initial system message could be added with messageModifier, etc.)
    stateModifier: systemPrompt,
  });
};
