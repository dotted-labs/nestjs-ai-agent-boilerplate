import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import * as vm from 'vm';

export interface JavaScriptExecutorInput {
  code: string;
}

export interface JavaScriptExecutorOutput {
  result: string;
}

// Define interfaces para los resultados de la ejecución
interface ExecutionSuccess {
  success: true;
  result: unknown;
  logs: string[];
}

interface ExecutionError {
  success: false;
  error: string;
  logs: string[];
}

type ExecutionResult = ExecutionSuccess | ExecutionError;

const inputSchema = z.object({
  code: z
    .string()
    .describe(
      'JavaScript code to execute for calculations or complex algorithms',
    ),
});

const outputSchema = z.object({
  result: z.string().describe('The result of the JavaScript code execution'),
});

/**
 * Creates a sandbox with common JavaScript objects but limited access.
 * This provides a safer environment for code execution.
 */
function createSandbox() {
  return {
    Array,
    Object,
    String,
    Number,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    RegExp,
    Map,
    Set,
    console: {
      log: (...args: unknown[]) => args.join(' '),
    },
    // Restricting these potentially dangerous functions
    setTimeout: undefined,
    setInterval: undefined,
    setImmediate: undefined,
    clearTimeout: undefined,
    clearInterval: undefined,
    clearImmediate: undefined,
    process: undefined,
    Buffer: undefined,
    require: undefined,
    eval: undefined,
    Function: undefined,
  };
}

/**
 * Safely converts any JavaScript value to a string representation
 */
function safeStringify(value: unknown): string {
  // Casos base simples
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return String(value);

  // Manejamos tipos específicos de objetos
  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Array]';
    }
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (value instanceof Map) {
    return '[Map]';
  }

  if (value instanceof Set) {
    return '[Set]';
  }

  // Para objetos normales, intentamos la conversión manual
  try {
    // Usamos un enfoque más seguro que JSON.stringify directamente
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';

    const formattedEntries = entries.map(
      ([key, val]) =>
        `"${key}": ${typeof val === 'object' ? (val === null ? 'null' : '"[object]"') : JSON.stringify(val)}`,
    );

    return `{ ${formattedEntries.join(', ')} }`;
  } catch {
    // Si hay error (por ejemplo, por referencias circulares)
    return '[object Object]';
  }
}

/**
 * Executes JavaScript code in a sandboxed environment with timeout
 */
function executeJavaScriptSafely(code: string): string {
  try {
    // Create a sandbox environment
    const sandbox = createSandbox();

    // Store console logs
    const logs: string[] = [];
    sandbox.console.log = (...args: unknown[]) => {
      const message = args.map((arg) => safeStringify(arg)).join(' ');
      logs.push(message);
      return message;
    };

    // Create a context for VM execution
    const context = vm.createContext(sandbox);

    // Add wrapper to capture return value
    const wrappedCode = `
      (function() {
        try {
          const result = (function() { 
            ${code} 
          })();
          
          return { success: true, result, logs };
        } catch (error) {
          return { success: false, error: error.message, logs };
        }
      })()
    `;

    // Execute with timeout
    const options = { timeout: 2000 }; // 2 seconds timeout
    const result = vm.runInContext(
      wrappedCode,
      context,
      options,
    ) as ExecutionResult;

    // Format the output
    let output = '';

    // Add logs if any
    if (result.logs && result.logs.length > 0) {
      output += result.logs.join('\n') + '\n\n';
    }

    // Add result or error
    if (result.success) {
      output += safeStringify(result.result);
    } else {
      output += `Error: ${result.error}`;
    }

    return output;
  } catch (error) {
    // Handle VM errors (like timeout)
    if (error instanceof Error) {
      return `JavaScript execution error: ${error.message}`;
    }
    return 'Unknown JavaScript execution error';
  }
}

/**
 * Ejecuta código JavaScript y devuelve el resultado como una promesa
 */
async function executeJavaScriptAsync(code: string): Promise<string> {
  // Simulamos una operación asíncrona
  return new Promise((resolve) => {
    // Ejecutamos el código y resolvemos con el resultado
    const result = executeJavaScriptSafely(code);
    resolve(result);
  });
}

export const javaScriptExecutorTool = new DynamicStructuredTool({
  name: 'javascript_executor',
  description:
    'Executes JavaScript code to perform calculations or solve complex algorithms. Use this for mathematical operations, arrays, objects, Date functions, data transformations, or custom algorithm implementations.',
  schema: inputSchema,
  func: async (input: JavaScriptExecutorInput) => {
    try {
      // Usamos la versión asíncrona que devuelve una promesa
      const result = await executeJavaScriptAsync(input.code);

      return outputSchema.parse({
        result,
      });
    } catch (error: unknown) {
      console.error('Error executing JavaScript code:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to execute JavaScript code: ${errorMessage}`);
    }
  },
});
