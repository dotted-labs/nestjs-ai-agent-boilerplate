import { BaseStore } from '@langchain/langgraph';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { initChatModel } from 'langchain/chat_models/universal';

/**
 * Get the store from the configuration or throw an error.
 * @param config - The configuration to get the store from.
 * @returns The store from the configuration.
 */
export function getStoreFromConfigOrThrow(
  config: LangGraphRunnableConfig,
): BaseStore {
  if (!config.store) {
    throw new Error('Store not found in configuration');
  }

  return config.store;
}

/**
 * Load a chat model from a fully specified name.
 * @param fullySpecifiedName - String in the format 'provider/model' or 'provider/account/provider/model'.
 * @returns A Promise that resolves to a BaseChatModel instance.
 */
export async function loadChatModel(fullySpecifiedName: string) {
  const index = fullySpecifiedName.indexOf('/');
  if (index === -1) {
    // If there's no "/", assume it's just the model
    return await initChatModel(fullySpecifiedName);
  } else {
    const provider = fullySpecifiedName.slice(0, index);
    const model = fullySpecifiedName.slice(index + 1);
    return await initChatModel(model, { modelProvider: provider });
  }
}
