/**
 * Stdio transport entry point for Claude Desktop local config.
 *
 * Claude Desktop config (~/.claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "dakota-marketplace": {
 *       "command": "node",
 *       "args": ["/path/to/dakota-mcp-server/src/stdio.js"],
 *       "env": { "USE_MOCK": "true" }
 *     }
 *   }
 * }
 */
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createToolRegistry } from './tools/registry.js';

const { definitions, handlers } = createToolRegistry();

const server = new Server(
  { name: 'dakota-marketplace', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: definitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = handlers[name];
  if (!handler) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'unknown_tool', message: `Tool '${name}' not found` }) }], isError: true };
  }
  return handler(args || {}, {});
});

const transport = new StdioServerTransport();
await server.connect(transport);
