
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import config from './config/env.js';
import { verifyTurnstileToken } from './utils/turnstile.js';
import { DEFAULT_RATE_LIMITS } from './lib/rate-limits.js';

const server = Fastify({
  logger: process.env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
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
  origin: config.ALLOWED_ORIGIN.split(','), // Support multiple origins
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
  reply.sendResponse({ status: 'ok', timestamp: new Date().toISOString() });
});

// Engines Manifest — real conversion matrix (Phase 2 architecture)
server.get('/api/engines', async (request, reply) => {
  reply.sendResponse({
    engines: {
      // Image conversions
      'image:png:webp': { version: '1.0.0', type: 'wasm', size: 12400000, script: '/engines/image/png-webp.js', wasm: '/engines/image/png-webp.wasm', checksum: 'sha256-png-webp', capabilities: { maxFileSizeMB: 100, browserMin: 'Chrome 90' } },
      'image:jpeg:webp': { version: '1.0.0', type: 'wasm', size: 13100000, script: '/engines/image/jpg-webp.js', wasm: '/engines/image/jpg-webp.wasm', checksum: 'sha256-jpg-webp', capabilities: { maxFileSizeMB: 100, browserMin: 'Chrome 90' } },
      'image:webp:png': { version: '1.0.0', type: 'wasm', size: 11200000, script: '/engines/image/webp-png.js', wasm: '/engines/image/webp-png.wasm', checksum: 'sha256-webp-png', capabilities: { maxFileSizeMB: 100, browserMin: 'Chrome 90' } },
      'image:png:jpeg': { version: '1.0.0', type: 'wasm', size: 10800000, script: '/engines/image/png-jpeg.js', wasm: '/engines/image/png-jpeg.wasm', checksum: 'sha256-png-jpeg', capabilities: { maxFileSizeMB: 100, browserMin: 'Chrome 90' } },
      // Add more engine manifests as WASM modules are onboarded
    },
  });
});

// Turnstile Verification
server.post(
  '/api/turnstile/verify',
  {
    config: {
      rateLimit: { max: DEFAULT_RATE_LIMITS['api/turnstile/verify'].max, timeWindow: DEFAULT_RATE_LIMITS['api/turnstile/verify'].timeWindow },
    },
  },
  async (request, reply) => {
    const { token } = request.body as { token: string };
    if (!token) return reply.status(400).sendResponse({ error: 'Token is required' }, 400);
    const isValid = await verifyTurnstileToken(token);
    if (isValid) reply.sendResponse({ verified: true });
    else reply.status(403).sendResponse({ error: 'Invalid Turnstile token' }, 403);
  }
);

// Backend Fallback Endpoint
server.post('/api/convert/fallback', async (request, reply) => {
  server.log.info('Backend fallback conversion requested');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const resultBlob = Buffer.from('Server-side converted content');
  reply.type('application/octet-stream').send(resultBlob);
});

// User Limits (mock — tied to subscription)
server.get('/api/user/limits', async (request, reply) => {
  reply.sendResponse({
    plan: 'free',
    limits: { maxFileSizeMB: 1024, dailyOps: 5, batchSize: 5 },
    entitlements: { priorityProcessing: false, unlimitedFiles: false, cloudStorage: false },
  });
});

// Global Error Handler
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  reply.status(error.statusCode || 500).send({
    success: false,
    error: { code: error.code || 'INTERNAL_SERVER_ERROR', message: error.message },
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
