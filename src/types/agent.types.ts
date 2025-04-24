import { HumanMessage } from '@langchain/core/messages';
import { StreamEventData } from './chat-model.types';

/**
 * Interface for the agent runnable
 */
export interface ReactAgentRunnable {
  streamEvents(
    input: { messages: HumanMessage[] },
    config: { configurable: { thread_id: string }; version: string },
  ): AsyncIterable<StreamEventData>;
}
