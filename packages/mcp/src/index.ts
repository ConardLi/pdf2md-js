#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ToolSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import express from 'express';
import fs from 'node:fs/promises';
import { parsePdf } from '@tiny-tool/pdf2md';

/**
 * Reads a file from the specified path.
 *
 *
 * @TODO read file from various protocols, such as http, https, ftp, etc.
 * @param filePath
 * @returns The content of the file as a Buffer.
 */
async function readFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath);
    return data;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

// Server setup
const server = new Server(
  {
    name: '@tiny-tool/pdf2md-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

const ConvertSchema = z.object({
  file_path: z.string(),
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'pdf2md',
        description: 'Convert PDF files to Markdown format, extract text content from the document',
        inputSchema: zodToJsonSchema(ConvertSchema) as ToolInput,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'pdf2md': {
        const parsed = ConvertSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for pdf2md: ${parsed.error}`);
        }

        console.log('pdf2md called with args:', parsed.data);

        const parsedResult = await parsePdf(parsed.data.file_path);
        return {
          content: [{ type: 'text', text: parsedResult.content }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

const connections = new Map<string, SSEServerTransport>();

const app = express();
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);

  const sessionId = transport.sessionId;
  console.log(`[${new Date().toISOString()}] 新的SSE连接建立: ${sessionId}`);
  connections.set(sessionId, transport);

  req.on('close', () => {
    console.log(`[${new Date().toISOString()}] SSE连接关闭: ${sessionId}`);
    connections.delete(sessionId);
  });

  // 将传输对象与MCP服务器连接
  await server.connect(transport);
  console.log(`[${new Date().toISOString()}] MCP服务器连接成功: ${sessionId}`);
});

app.post('/messages', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] 收到客户端消息:`, req.query);
    const sessionId = req.query.sessionId as string;

    // 查找对应的SSE连接并处理消息
    if (connections.size > 0) {
      const transport: SSEServerTransport = connections.get(sessionId) as SSEServerTransport;
      // 使用transport处理消息
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        throw new Error('没有活跃的SSE连接');
      }
    } else {
      throw new Error('没有活跃的SSE连接');
    }
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] 处理客户端消息失败:`, error);
    res.status(500).json({ error: '处理消息失败', message: error.message });
  }
});

app.listen(3002);
