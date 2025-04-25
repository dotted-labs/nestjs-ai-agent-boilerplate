import { HumanMessage } from '@langchain/core/messages';
import { CompiledStateGraph } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '../../../config/config.service';
import { graph } from '../graphs/default.graph';

@Injectable()
export class ChatService {
  private agent: CompiledStateGraph<any, any, any, any, any, any>;

  constructor(private configService: ConfigService) {
    // this.agent = createAgent(
    //   this.configService.openAiModel,
    //   this.configService.openAiApiKey,
    //   this.configService,
    //   `
    //   When using a tool, you can comment on the data obtained but without returning
    //   the data again since the response JSONs will be interpreted externally,
    //   so if a JSON is returned, do not repeat or structure
    //   the data in the response message.

    //   If I ask you to create a table, use the table_tool tool, do not return it directly to the user.
    //   `,
    // ) as ReactAgentRunnable;
    this.agent = graph;
  }

  /**
   * Handles a user's chat message and streams the agent's response via SSE.
   * @param message User's text.
   * @param threadId Conversation thread identifier (for persistent context).
   * @param response Express Response object to send SSE events.
   */
  async chat(message: string, threadId: string, response: Response): Promise<void> {
    // Configure SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders(); // Send headers immediately

    // Create the user message for the agent
    const userMessage = new HumanMessage(message);

    // Invoke the agent in streaming mode.
    // We use configurable.thread_id so the agent uses the memory associated with this thread.

    try {
      // Iterate over the agent's output events (token by token)
      const agentStream = this.agent.streamEvents(
        { messages: [userMessage] },
        {
          configurable: {
            model: this.configService.openAiModel,
            thread_id: threadId,
          },
          version: 'v2',
        },
      );

      for await (const { event, data } of agentStream) {
        switch (event) {
          case 'on_chat_model_stream': {
            // Type guard might be safer than assertion
            if (typeof data === 'object' && data !== null && 'chunk' in data) {
              // Removed unnecessary assertion
              console.log('data', data?.chunk?.['id']);
              const chunk = data.chunk?.content;
              if (chunk) {
                // Ensure we're sending the chunk with properly encoded line breaks
                const formattedChunk = chunk.replace(/\n/g, '\\n');
                response.write(`event: message\n`);
                response.write(`data: ${formattedChunk}\n\n`);
              }
            }
            break;
          }
          case 'on_tool_start': {
            // Type guard
            if (typeof data === 'object' && data !== null && 'tool_name' in data) {
              // Removed unnecessary assertion
              const toolName = data.tool_name ?? 'unknown tool';
              response.write(`event: tool_start\n`);
              response.write(`data: starting tool ${JSON.stringify(toolName)}\n\n`);
            }
            break;
          }
          case 'on_tool_end': {
            // Type guard
            if (typeof data === 'object' && data !== null && 'output' in data) {
              // Removed unnecessary assertion
              const out = data.output;
              // JSON.stringify handles unknown safely
              const json = JSON.stringify(out);
              response.write(`event: tool\n`);
              response.write(`data: ${json}\n\n`);
            }
            break;
          }
          // Add a default case to handle other event types or unknown data structures gracefully
          default:
            break;
        }
      }
      // Once the complete response is finished, send a completion event and close.
      response.write(`event: done\n`);
      response.write(`data: done\n\n`); // It's good practice to send some data with the done event
    } catch (err) {
      // In case of error, send the error message as an SSE event.
      console.error('Agent error:', err);
      // Ensure err has a message property before accessing it
      const errorMessage = err instanceof Error ? err.message : String(err);
      // Check if headers were already sent before writing error
      if (!response.headersSent) {
        response.setHeader('Content-Type', 'text/event-stream'); // Ensure correct header for error
        // Add other headers if necessary
      }
      // Ensure the response is still writable before writing
      if (!response.writableEnded) {
        response.write(`event: error\ndata: ${errorMessage}\n\n`);
      }
    } finally {
      // Close the SSE connection
      // Ensure the response is still writable before ending
      if (!response.writableEnded) {
        response.end();
      }
    }
  }
}
