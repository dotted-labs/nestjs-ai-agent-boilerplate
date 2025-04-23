import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { Tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from '../../../db/supabase.service';

// Import LangGraph specific tools
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

// Import tool factory functions
import { createPublicTenderTool } from '../tools/public-tender.tool';
import { createVectorSearchTool } from '../tools/vector-search.tool';
import { ConfigService } from '../../../config/config.service';

// Interface for conversation history items from Supabase
interface ConversationHistoryItem {
  thread_id?: string; // Added for saving
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string; // For tool messages
  tool_call_id?: string; // For tool messages (matching ToolMessage structure)
}

// Define a type for the stream chunks to address TypeScript warnings
interface AgentStreamChunk {
  tools?: {
    messages?: Array<{
      name?: string;
      content?: string;
      tool_call_id?: string;
    }>;
  };
  agent?: {
    messages?: Array<{
      content?: string;
    }>;
  };
  tool_calls?: Array<{
    name?: string;
    args?: Record<string, unknown>;
  }>;
  thinking?: string;
  steps?: Array<{
    action?: {
      tool?: string;
      toolInput?: Record<string, unknown>;
      log?: string;
    };
    observation?: unknown;
  }>;
}

// Define interface for agent graph to address TypeScript warnings
interface AgentGraphInterface {
  stream: (
    input: { messages: BaseMessage[] },
    config: Record<string, unknown>,
  ) => Promise<AsyncIterable<AgentStreamChunk>>;
}

@Injectable()
export class AgentService {
  private model: BaseChatModel;
  private agentTools: Tool[] = [];
  private agentGraph: AgentGraphInterface;
  private systemMessage: SystemMessage;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    // Initialize System Message
    this.systemMessage = new SystemMessage(
      `Eres un asistente virtual inteligente diseñado para ayudar a los usuarios.
      Debes responder siempre en formato markdown para una mejor visualización.
      
     
      `,
    );

    // Ejemplo de formato HTML para tus respuestas:
    // <div class="bg-white rounded-lg shadow-md p-6 my-4">
    //   <h3 class="text-xl font-bold text-gray-800 mb-4">Título de la respuesta</h3>
    //   <p class="text-gray-600 mb-4 leading-relaxed">Contenido de la respuesta</p>
    //   <ul class="list-disc list-inside space-y-2">
    //     <li class="text-gray-600">Elemento de lista si es necesario</li>
    //   </ul>
    // </div>

    // Este html se va a escapar por un json asi que usa \\ para escapar los caracteres especiales como las comillas.
    // no uses bgs ni sombras .
    // que no empiece ni termine por \`\`\` html o

    // Initialize Model
    this.model = new ChatOpenAI({
      modelName: this.configService.openAiModel,
      openAIApiKey: this.configService.openAiApiKey,
      temperature: 0.2,
      streaming: true,
    });

    // Create Tool Instances using factories
    // const vectorSearchToolInstance = createVectorSearchTool(
    //   this.supabaseService.client,
    //   this.configService,
    // );
    // const publicTenderToolInstance = createPublicTenderTool(
    //   this.supabaseService.client,
    // );

    // this.agentTools = [vectorSearchToolInstance, publicTenderToolInstance];
    this.agentTools = [];

    // Create a memory saver for persistent conversation state
    const agentCheckpointer = new MemorySaver();

    // Initialize the LangGraph React Agent
    const agent = createReactAgent({
      llm: this.model,
      tools: this.agentTools,
      checkpointSaver: agentCheckpointer,
    });

    this.agentGraph = agent as unknown as AgentGraphInterface;
  }

  async chat(message: string, threadId: string | null, res: Response) {
    if (!this.agentGraph) {
      res.status(500).send('Agent graph not initialized');
      return;
    }

    // Track start time
    const startTime = Date.now();

    // Setup for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let history: BaseMessage[] = [];
    let finalAssistantMessage = '';
    const toolCallHistory: ToolMessage[] = []; // Keep track of tool calls/results for DB saving

    try {
      // Get conversation history from Supabase
      if (threadId) {
        const { data, error } = await this.supabaseService.client
          .from('conversations')
          .select<string, ConversationHistoryItem>('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching history:', error);
        } else if (data) {
          history = data
            .map((item): BaseMessage | null => {
              switch (item.role) {
                case 'system':
                  return new SystemMessage(item.content);
                case 'user':
                  return new HumanMessage(item.content);
                case 'assistant':
                  return new AIMessage(item.content);
                case 'tool': {
                  const toolMsg = new ToolMessage({
                    content: item.content,
                    tool_call_id: item.tool_call_id || '',
                    name: item.name,
                  });
                  toolCallHistory.push(toolMsg);
                  return toolMsg;
                }
                default:
                  console.warn(
                    `Unknown message role in history: ${String(item.role)}`,
                  );
                  return null; // Skip unknown roles
              }
            })
            .filter((msg): msg is BaseMessage => msg !== null);
        }
      }

      // Add system message at the beginning if not present
      if (history.length === 0 || !(history[0] instanceof SystemMessage)) {
        history.unshift(this.systemMessage);
      }

      // Create the human message to add to existing messages
      const humanMessage = new HumanMessage(message);

      // Create the config to pass to the LangGraph agent
      const config = {
        configurable: { thread_id: threadId || 'default' },
        recursion_limit: 10,
      };

      // Set up streaming with LangGraph
      const agentStream = await this.agentGraph.stream(
        { messages: [...history, humanMessage] },
        config,
      );

      // Process the stream chunks
      for await (const chunk of agentStream) {
        // Log del tipo de chunk para depuración
        console.log('Stream Chunk Keys:', Object.keys(chunk));

        // Procesamiento basado en el formato real de respuesta

        // 1. Procesar respuestas de herramientas (como el ejemplo mostrado)
        if (
          chunk.tools &&
          chunk.tools.messages &&
          Array.isArray(chunk.tools.messages)
        ) {
          for (const toolMessage of chunk.tools.messages) {
            // Capturar el mensaje para guardar en historial
            if (toolMessage.name && toolMessage.content) {
              const toolMsg = new ToolMessage({
                content: toolMessage.content,
                tool_call_id: toolMessage.tool_call_id || '',
                name: toolMessage.name,
              });
              toolCallHistory.push(toolMsg);

              // Determinar tipo de evento según la herramienta
              let eventType = 'tool_end';
              const content = toolMessage.content;

              // Caso especial para public_tender_search
              if (toolMessage.name === 'public_tender_search') {
                eventType = 'public_tender_list';
              }
              if (toolMessage.name === 'vector_search') {
                eventType = 'vector_search';
              }

              // Enviar resultado al cliente
              res.write(
                `data: ${JSON.stringify({
                  type: eventType,
                  observation: content,
                })}\n\n`,
              );
            }
          }
        }

        // 2. Procesar mensajes del agente (respuesta final o intermedias)
        if (
          chunk.agent &&
          chunk.agent.messages &&
          Array.isArray(chunk.agent.messages)
        ) {
          for (const message of chunk.agent.messages) {
            if (message.content) {
              // Guardar el mensaje final
              finalAssistantMessage =
                typeof message.content === 'string'
                  ? message.content
                  : JSON.stringify(message.content);

              // Enviar mensaje al usuario
              res.write(
                `data: ${JSON.stringify({
                  type: 'message',
                  content: finalAssistantMessage,
                })}\n\n`,
              );
            }
          }
        }

        // 3. Procesar llamadas a herramientas
        if (chunk.tool_calls && Array.isArray(chunk.tool_calls)) {
          for (const toolCall of chunk.tool_calls) {
            const toolName = toolCall.name || '';
            const toolInput: Record<string, unknown> = toolCall.args || {};

            // Enviar inicio de la herramienta
            res.write(
              `data: ${JSON.stringify({
                type: 'tool_start',
                name: toolName,
                input: toolInput,
              })}\n\n`,
            );
          }
        }

        // 4. Procesar pensamientos o razonamiento
        if (chunk.thinking) {
          res.write(
            `data: ${JSON.stringify({
              type: 'thinking',
              content: chunk.thinking,
            })}\n\n`,
          );
        }

        // 5. Procesar pasos de razonamiento
        if (chunk.steps && Array.isArray(chunk.steps)) {
          for (const step of chunk.steps) {
            // Enviar acción si existe
            if (step.action) {
              res.write(
                `data: ${JSON.stringify({
                  type: 'action',
                  tool: step.action.tool,
                  input: step.action.toolInput as Record<string, unknown>,
                  thought: step.action.log,
                })}\n\n`,
              );
            }

            // Enviar observación si existe
            if (step.observation) {
              res.write(
                `data: ${JSON.stringify({
                  type: 'observation',
                  result: step.observation as unknown,
                })}\n\n`,
              );
            }
          }
        }
      }

      // Save the conversation to Supabase
      if (threadId) {
        const messagesToSave: Omit<ConversationHistoryItem, 'thread_id'>[] = [];

        // User Message
        messagesToSave.push({
          role: 'user',
          content: message,
        });

        // Tool Messages
        toolCallHistory.forEach((toolMsg) => {
          messagesToSave.push({
            role: 'tool',
            content:
              typeof toolMsg.content === 'string'
                ? toolMsg.content
                : JSON.stringify(toolMsg.content),
            tool_call_id: toolMsg.tool_call_id,
            name: toolMsg.name,
          });
        });

        // Final Assistant Response
        if (finalAssistantMessage) {
          messagesToSave.push({
            role: 'assistant',
            content: finalAssistantMessage,
          });
        }

        if (messagesToSave.length > 0) {
          const itemsToInsert = messagesToSave.map((m) => ({
            ...m,
            thread_id: threadId,
          }));
          const { error: insertError } = await this.supabaseService.client
            .from('conversations')
            .insert(itemsToInsert);

          if (insertError) {
            console.error('Error saving conversation:', insertError);
          }
        }
      }

      // Calculate total time in milliseconds
      const totalTime = Date.now() - startTime;

      // Send timing information before done message
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          observation: {
            totalTimeMs: totalTime,
          },
        })}\n\n`,
      );
      res.end();
    } catch (error) {
      // Calculate total time even on error
      const totalTime = Date.now() - startTime;

      console.error('Error in chat:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`,
      );

      // Send timing information before done message
      res.write(
        `data: ${JSON.stringify({ type: 'done', totalTimeMs: totalTime })}\n\n`,
      );
      res.end();
    }
  }
}
