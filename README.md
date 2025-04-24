# NestJS AI Agent Boilerplate

A modern NestJS-based boilerplate for building AI agents using LangChain.js and LangGraph. This project provides a solid foundation for creating AI-powered applications with streaming responses, tool execution, and persistent conversation memory.

## Features

- **AI Agent Integration**: Built with LangChain.js and LangGraph for sophisticated agent workflows
- **OpenAI Integration**: Pre-configured to work with GPT models
- **Streaming Responses**: Server-Sent Events (SSE) for real-time streaming responses
- **Tool Framework**: Extensible tool system with Zod schema validation
- **Conversation Memory**: Persistent memory across conversation sessions
- **API Documentation**: Swagger UI integration for exploring and testing endpoints
- **Supabase Integration**: Pre-configured for database storage
- **TypeScript**: Fully typed codebase for better development experience

## Prerequisites

- Node.js (v18 or higher)
- An OpenAI API key
- Supabase account (optional)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nestjs-ai-agent-boilerplate.git

# Install dependencies
cd nestjs-ai-agent-boilerplate
npm install
```

### Configuration

1. Create a `.env` file based on the following template:

```env
# Environment
NODE_ENV=development
PORT=3000

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

Once running, access the Swagger documentation at: http://localhost:3000/api/docs

## Project Structure

```
src/
├── config/           # Application configuration
├── db/               # Database connections (Supabase)
├── modules/
│   └── agent/        # AI Agent implementation
│       ├── dto/      # Data transfer objects
│       ├── services/ # Agent services
│       └── tools/    # Custom tools for the agent
└── types/            # TypeScript type definitions
```

## How It Works

The application creates an AI agent using LangGraph's reactive agent framework, allowing for:

1. **User Interactions**: Users send messages through the `/agent/chat` endpoint
2. **Streaming Responses**: The agent processes requests and streams responses in real-time
3. **Tool Usage**: The agent can use tools like the table generator to create structured data
4. **Memory Management**: Conversations are stored by thread ID, maintaining context between interactions

## Example Usage

```typescript
// Example API call
const response = await fetch('http://localhost:3000/agent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Generate a table with 3 columns and 5 rows of random data',
    threadId: 'user-123',
  }),
});

// Handle streaming response
const reader = response.body.getReader();
// Process the stream...
```

## Extending the Agent

### Adding Custom Tools

1. Create a new tool file in `src/modules/agent/tools/`
2. Define input/output schemas using Zod
3. Create a new tool using `DynamicStructuredTool`
4. Add the tool to the agent in `src/modules/agent/services/agent.ts`

Example:

```typescript
// New tool implementation
export const myCustomTool = new DynamicStructuredTool({
  name: 'my_custom_tool',
  description: 'Description of what the tool does',
  schema: z.object({
    // Define input parameters
  }),
  func: async (input) => {
    // Implement tool functionality
    return result;
  },
});

// Add to agent.ts
tools: [randomTableGeneratorTool, myCustomTool],
```

## License

[MIT License](LICENSE)
