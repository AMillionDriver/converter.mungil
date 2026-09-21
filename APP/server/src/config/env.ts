import 'dotenv/config';
// import { z } from 'zod'; // Removed unused import

interface EnvConfig {
  NODE_ENV: 'development' | 'production';
  PORT: number;
  ALLOWED_ORIGIN: string;
  CLOUDFLARE_TURNSTILE_SECRET: string;
  CLOUDFLARE_TURNSTILE_SITEKEY: string;
}

const config: EnvConfig = {
  NODE_ENV:
    (process.env.NODE_ENV as 'development' | 'production') || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'http://localhost:5174',
  // Support both naming conventions from ENV.md and .env
  CLOUDFLARE_TURNSTILE_SECRET:
    process.env.CLOUDFLARE_TURNSTILE_SECRET ||
    process.env.TURNSTILE_SECRET_KEY ||
    '',
  CLOUDFLARE_TURNSTILE_SITEKEY:
    process.env.CLOUDFLARE_TURNSTILE_SITEKEY ||
    process.env.TURNSTILE_SITE_KEY ||
    '',
};

// Validate critical secrets
if (!config.CLOUDFLARE_TURNSTILE_SECRET) {
  console.warn(
    'WARNING: CLOUDFLARE_TURNSTILE_SECRET is not defined. Turnstile verification will fail.'
  );
}

export default config;
