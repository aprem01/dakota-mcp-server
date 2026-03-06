import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import crypto from 'crypto';
import authRoutes from './auth/routes.js';
import { createToolRegistry } from './tools/registry.js';

const PORT = process.env.PORT || 3000;
const { definitions, handlers } = createToolRegistry();

const transports = {};       // Streamable HTTP sessions
const sseTransports = {};    // SSE sessions

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

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} Accept: ${req.headers.accept || 'none'}`);
  next();
});

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id');
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

// ─── SSE Transport (used by ChatGPT and older MCP clients) ───

app.get('/sse', async (req, res) => {
  console.log('[SSE] New client connected');
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();

  sseTransports[transport.sessionId] = { transport, server };

  server.onclose = () => {
    delete sseTransports[transport.sessionId];
  };

  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log(`[SSE] Message for session: ${sessionId}`);

  const session = sseTransports[sessionId];
  if (!session) {
    res.status(400).json({ error: 'Invalid session. Connect to /sse first.' });
    return;
  }

  await session.transport.handlePostMessage(req, res, req.body);
});

// ─── Streamable HTTP Transport (newer MCP clients) ───

app.post('/mcp', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[MCP] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32000, message: err.message }, id: null });
    }
  }
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
  console.log(`[Dakota MCP] Streamable HTTP: http://localhost:${PORT}/mcp`);
  console.log(`[Dakota MCP] SSE transport:    http://localhost:${PORT}/sse`);
  console.log(`[Dakota MCP] REST test API:    http://localhost:${PORT}/api/tools`);
  console.log(`[Dakota MCP] Health:           http://localhost:${PORT}/health`);
});
