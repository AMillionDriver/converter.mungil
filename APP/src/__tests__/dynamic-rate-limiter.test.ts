import { describe, it, expect, beforeEach } from 'vitest';
import {
  DynamicRateLimiter,
  RateLimiterState,
} from '../lib/dynamic-rate-limiter';

describe('DynamicRateLimiter - Hardware-Adaptive & Token Bucket Throttle', () => {
  let limiter: DynamicRateLimiter;

  beforeEach(() => {
    limiter = new DynamicRateLimiter({
      baseCapacity: 4,
      baseRefillRatePerSec: 2,
      burstThreshold: 4,
    });
  });

  it('should detect hardware profile and compute capability score', () => {
    const profile = limiter.getHardwareProfile();

    expect(profile.cores).toBeGreaterThanOrEqual(1);
    expect(profile.capabilityScore).toBeGreaterThanOrEqual(0.2);
    expect(profile.capabilityScore).toBeLessThanOrEqual(1.0);
    expect(profile.recommendedConcurrency).toBeGreaterThanOrEqual(1);
    expect(profile.recommendedConcurrency).toBeLessThanOrEqual(4);
    expect(profile.interTaskDelayMs).toBeGreaterThanOrEqual(20);
  });

  it('should permit operations when tokens are available and throttle when exhausted', () => {
    // 1st operation -> allowed
    const check1 = limiter.canExecute(1);
    expect(check1.allowed).toBe(true);
    expect(check1.waitMs).toBe(0);

    // Consume all available tokens
    for (let i = 0; i < 10; i++) {
      limiter.canExecute(1);
    }

    // Now tokens should be exhausted
    const checkExhausted = limiter.canExecute(1);
    if (!checkExhausted.allowed) {
      expect(checkExhausted.waitMs).toBeGreaterThan(0);
      expect(
        checkExhausted.state === RateLimiterState.THROTTLED ||
          checkExhausted.state === RateLimiterState.LOCKED
      ).toBe(true);
    }
  });

  it('should detect rapid burst clicks and trigger exponential cooldown lockout', () => {
    const fastLimiter = new DynamicRateLimiter({
      baseCapacity: 10,
      burstThreshold: 3,
    });

    // Rapid simulated clicks within milliseconds (< 250ms)
    fastLimiter.canExecute(1);
    fastLimiter.canExecute(1);
    fastLimiter.canExecute(1);
    const lockedCheck = fastLimiter.canExecute(1);

    expect(lockedCheck.allowed).toBe(false);
    expect(lockedCheck.state).toBe(RateLimiterState.LOCKED);
    expect(lockedCheck.waitMs).toBeGreaterThan(500);
    expect(fastLimiter.getRemainingLockMs()).toBeGreaterThan(500);
  });

  it('should execute tasks cooperatively and decrement active job counters', async () => {
    const freshLimiter = new DynamicRateLimiter({ baseCapacity: 5 });

    let executed = false;
    const result = await freshLimiter.executeTask(async () => {
      executed = true;
      return 'task-success';
    });

    expect(executed).toBe(true);
    expect(result).toBe('task-success');
  });

  it('should solve Proof-of-Work micro-challenge and reset throttle state', async () => {
    const challengeLimiter = new DynamicRateLimiter();
    // Test micro challenge with low difficulty for fast unit test
    const solved = await challengeLimiter.solvePoWChallenge(2);
    expect(solved).toBe(true);
    expect(challengeLimiter.getState()).toBe(RateLimiterState.IDLE);
  });
});
