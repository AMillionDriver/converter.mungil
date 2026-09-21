import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import config from './config/env.js';
import { verifyTurnstileToken } from './utils/turnstile.js';
import { DEFAULT_RATE_LIMITS } from './lib/rate-limits.js';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
});

// Security Headers
server.register(helmet);

// Rate Limiting
server.register(rateLimit, {
  global: true,
  max: DEFAULT_RATE_LIMITS.default.max,
  timeWindow: DEFAULT_RATE_LIMITS.default.timeWindow,
});

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
    engines: {
      'image:png:webp': {
        version: '1.0.0',
        type: 'wasm',
        size: 12400000,
        script: '/engines/image/png-webp.js',
        wasm: '/engines/image/png-webp.wasm',
        checksum: 'sha256-example-hash-1',
        capabilities: {
          maxFileSizeMB: 100,
          browserMin: 'Chrome 90',
        },
      },
      'image:jpeg:webp': {
        version: '1.0.0',
        type: 'wasm',
        size: 13100000,
        script: '/engines/image/jpg-webp.js',
        wasm: '/engines/image/jpg-webp.wasm',
        checksum: 'sha256-example-hash-2',
        capabilities: {
          maxFileSizeMB: 100,
          browserMin: 'Chrome 90',
        },
      },
      'document:pdf:docx': {
        version: '1.0.0',
        type: 'wasm',
        size: 18400000,
        script: '/engines/document/pdf-docx.js',
        wasm: '/engines/document/pdf-docx.wasm',
        checksum: 'sha256-example-hash-3',
        capabilities: {
          maxFileSizeMB: 50,
          browserMin: 'Chrome 95',
        },
      },
    },
  });
});

// Turnstile Verification
server.post(
  '/api/turnstile/verify',
  {
    config: {
      rateLimit: {
        max: DEFAULT_RATE_LIMITS['api/turnstile/verify'].max,
        timeWindow: DEFAULT_RATE_LIMITS['api/turnstile/verify'].timeWindow,
      },
    },
  },
  async (request, reply) => {
    const { token } = request.body as { token: string };
    if (!token) {
      return reply
        .status(400)
        .sendResponse({ error: 'Token is required' }, 400);
    }
    const isValid = await verifyTurnstileToken(token);
    if (isValid) {
      reply.sendResponse({ verified: true });
    } else {
      reply.status(403).sendResponse({ error: 'Invalid Turnstile token' }, 403);
    }
  }
);

// Backend Fallback Endpoint (Mock)
server.post('/api/convert/fallback', async (request, reply) => {
  // In a real scenario, this would use a server-side WASM runtime (like wasmer-js or node-wasm)
  // to perform the conversion.
  server.log.info('Backend fallback conversion requested');

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const resultBlob = Buffer.from('Server-side converted content');
  reply.type('application/octet-stream').send(resultBlob);
});

// Mock User Limits
server.get('/api/user/limits', async (request, reply) => {
  // In a real app, this would check the authenticated user's plan in DB
  // Mocking a 'free' plan response
  reply.sendResponse({
    plan: 'free',
    limits: {
      maxFileSizeMB: 1024,
      dailyOps: 5,
      batchSize: 5,
    },
    entitlements: {
      priorityProcessing: false,
      unlimitedFiles: false,
      cloudStorage: false,
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
