export interface RateLimitConfig {
  max: number;
  timeWindow: string;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'api/turnstile/verify': { max: 10, timeWindow: '1m' },
  'api/user/limits': { max: 100, timeWindow: '1h' },
  default: { max: 1000, timeWindow: '1h' },
};
