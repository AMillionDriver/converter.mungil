import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import config from './config/env.js';
import { verifyTurnstileToken } from './utils/turnstile.js';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
});

// Security Headers
server.register(helmet);

// CORS Configuration
server.register(cors, {
  origin: config.ALLOWED_ORIGIN,
});

// Standard Response Envelope
server.decorateReply('sendResponse', function (data: unknown, code = 200) {
  this.code(code).send({
    success: code >= 200 && code < 300,
    data,
  });
});

// Health Check
server.get('/api/health', async (request, reply) => {
  reply.sendResponse({ status: 'ok' });
});

// Mock Engines Manifest
server.get('/api/engines', async (request, reply) => {
  reply.sendResponse({
    engines: [
      { id: 'pdf-to-word', name: 'PDF to Word', wasm: '/wasm/pdf2word.wasm' },
      { id: 'word-to-pdf', name: 'Word to PDF', wasm: '/wasm/word2pdf.wasm' },
    ],
  });
});

// Turnstile Verification
server.post('/api/turnstile/verify', async (request, reply) => {
  const { token } = request.body as { token: string };
  if (!token) {
    return reply.status(400).sendResponse({ error: 'Token is required' }, 400);
  }
  const isValid = await verifyTurnstileToken(token);
  if (isValid) {
    reply.sendResponse({ verified: true });
  } else {
    reply.status(403).sendResponse({ error: 'Invalid Turnstile token' }, 403);
  }
});

// Mock User Limits
server.get('/api/user/limits', async (request, reply) => {
  reply.sendResponse({
    plan: 'free',
    limits: {
      maxFileSizeMB: 1024,
      dailyOps: 5,
      batchSize: 5,
    },
  });
});

// Global Error Handler
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  reply.status(error.statusCode || 500).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message,
    },
  });
});

const start = async () => {
  try {
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${config.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
