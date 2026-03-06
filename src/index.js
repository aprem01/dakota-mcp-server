import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import crypto from 'crypto';
import authRoutes from './auth/routes.js';
import { createToolRegistry } from './tools/registry.js';

const PORT = process.env.PORT || 3000;
const { definitions, handlers, TOOLS } = createToolRegistry();

const transports = {};

function createMcpServer() {
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

  return server;
}

const app = express();
app.use(express.json());

// Allow CORS for external MCP clients (ChatGPT, etc.)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id, ngrok-skip-browser-warning');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use('/', authRoutes);

// ─── Health check ───
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'dakota-marketplace-mcp', version: '1.0.0' });
});

// ─── REST API for manual/curl testing ───

app.get('/api/tools', (req, res) => {
  res.json({ tools: definitions });
});

app.post('/api/tools/:name', async (req, res) => {
  const handler = handlers[req.params.name];
  if (!handler) {
    res.status(404).json({ error: `Tool '${req.params.name}' not found` });
    return;
  }
  try {
    const result = await handler(req.body, {});
    const content = result.content?.[0]?.text;
    res.json({
      tool: req.params.name,
      isError: result.isError || false,
      data: content ? JSON.parse(content) : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MCP Streamable HTTP Transport (Claude Desktop, ChatGPT, Cursor) ───

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  if (sessionId && transports[sessionId]) {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res, req.body);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) delete transports[sid];
  };

  const server = createMcpServer();
  await server.connect(transport);
  if (transport.sessionId) transports[transport.sessionId] = transport;
  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({ error: 'Invalid or missing session. Send a POST to /mcp first.' });
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && transports[sessionId]) {
    await transports[sessionId].handleRequest(req, res);
    transports[sessionId].close?.();
    delete transports[sessionId];
  } else {
    res.status(400).json({ error: 'Invalid session' });
  }
});

app.listen(PORT, () => {
  console.log(`[Dakota MCP] Server running on port ${PORT}`);
  console.log(`[Dakota MCP] MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[Dakota MCP] REST test API: http://localhost:${PORT}/api/tools`);
  console.log(`[Dakota MCP] Health: http://localhost:${PORT}/health`);
});
