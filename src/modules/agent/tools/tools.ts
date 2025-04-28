import { javaScriptExecutorTool } from './javascript.tool';
import { placesTool } from './places.tool';
import { webScraperTool } from './scraper.tool';
import { randomTableGeneratorTool } from './table.tool';
import { unsplashTool } from './unsplash.tool';
import { retrieverTool } from './retriever.tool';

export const TOOLS = [unsplashTool, placesTool, randomTableGeneratorTool, javaScriptExecutorTool, webScraperTool, retrieverTool];
