/**
 * Dynamic Rate Limiter & Hardware-Adaptive Concurrency Controller
 *
 * Implements Lazy Token Bucket, Exponential Backoff with Jitter,
 * Hardware Telemetry Scaling, Cross-Tab Broadcast Coordination,
 * and Cooperative Task Yielding for Client-Side WebAssembly SPAs.
 */

export enum RateLimiterState {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  THROTTLED = 'THROTTLED',
  LOCKED = 'LOCKED',
}

export interface HardwareProfile {
  cores: number;
  memoryGB: number;
  capabilityScore: number; // 0.2 to 1.0
  recommendedConcurrency: number; // 1 to 4
  interTaskDelayMs: number;
}

export interface DynamicRateLimiterOptions {
  baseCapacity?: number;
  baseRefillRatePerSec?: number;
  burstThreshold?: number; // Spam clicks trigger backoff
  maxLockDurationMs?: number;
}

export class DynamicRateLimiter {
  private state: RateLimiterState = RateLimiterState.IDLE;
  private tokens: number;
  private capacity: number;
  private refillRate: number; // tokens per millisecond
  private lastRefillTimestamp: number;

  private burstAttemptCount = 0;
  private lastActionTimestamp = 0;
  private lockUntilTimestamp = 0;

  private hardware: HardwareProfile;
  private broadcastChannel: BroadcastChannel | null = null;
  private activeJobs = 0;

  constructor(private options: DynamicRateLimiterOptions = {}) {
    this.hardware = this.evaluateHardware();

    // Scale token capacity and refill rate according to hardware profile
    this.capacity = Math.max(
      2,
      Math.round((options.baseCapacity ?? 5) * this.hardware.capabilityScore)
    );
    const refillPerSec =
      (options.baseRefillRatePerSec ?? 1) * this.hardware.capabilityScore;
    this.refillRate = refillPerSec / 1000;
    this.tokens = this.capacity;
    this.lastRefillTimestamp =
      typeof performance !== 'undefined' ? performance.now() : Date.now();

    this.initCrossTabSync();
  }

  /**
   * Evaluates client hardware capabilities to calculate capacity score
   */
  private evaluateHardware(): HardwareProfile {
    let cores = 4;
    let memoryGB = 4;

    if (typeof navigator !== 'undefined') {
      cores = navigator.hardwareConcurrency || 4;
      if ('deviceMemory' in navigator) {
        memoryGB =
          (navigator as unknown as { deviceMemory: number }).deviceMemory || 4;
      }
    }

    const coreScore = Math.min(1.0, cores / 8);
    const memScore = Math.min(1.0, memoryGB / 8);
    const capabilityScore = Math.max(0.2, coreScore * 0.5 + memScore * 0.5);

    // Concurrency Slot: 1 (low-end) up to 4 (high-end workstation)
    const recommendedConcurrency = Math.max(
      1,
      Math.min(4, Math.floor(capabilityScore * 4))
    );

    // Inter-task delay for garbage collection & cooperative yielding
    const interTaskDelayMs = Math.round(20 + (1 - capabilityScore) * 180);

    return {
      cores,
      memoryGB,
      capabilityScore,
      recommendedConcurrency,
      interTaskDelayMs,
    };
  }

  /**
   * Synchronizes rate-limit locks across browser tabs
   */
  private initCrossTabSync(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('mungil_concurrency_bus');
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          const { type, payload } = event.data || {};
          if (type === 'LOCKOUT_SYNC') {
            this.applyRemoteLockout(payload.durationMs);
          } else if (type === 'JOB_ALLOCATION') {
            this.activeJobs = Math.max(0, this.activeJobs + payload.delta);
          }
        };
      } catch {
        // BroadcastChannel unavailable in some private mode configurations
      }
    }
  }

  /**
   * Refills token bucket lazily on-demand without background intervals
   */
  private refillTokens(): void {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - this.lastRefillTimestamp;

    if (elapsed > 0) {
      this.tokens = Math.min(
        this.capacity,
        this.tokens + elapsed * this.refillRate
      );
      this.lastRefillTimestamp = now;
    }
  }

  /**
   * Evaluates if an execution request is permitted or should be throttled/locked
   */
  public canExecute(taskCost = 1): {
    allowed: boolean;
    waitMs: number;
    state: RateLimiterState;
  } {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Check LOCKED state
    if (this.state === RateLimiterState.LOCKED) {
      const remainingLock = this.lockUntilTimestamp - now;
      if (remainingLock > 0) {
        return {
          allowed: false,
          waitMs: Math.ceil(remainingLock),
          state: this.state,
        };
      }
      // Lock expired, return to IDLE
      this.state = RateLimiterState.IDLE;
      this.burstAttemptCount = 0;
    }

    // Detect Rapid Burst / Rage Clicks (< 250ms interval)
    const timeSinceLastAction = now - this.lastActionTimestamp;
    this.lastActionTimestamp = now;

    if (timeSinceLastAction < 250) {
      this.burstAttemptCount++;
    } else {
      this.burstAttemptCount = Math.max(0, this.burstAttemptCount - 1);
    }

    // Trigger exponential backoff if spam click threshold is breached
    if (this.burstAttemptCount >= (this.options.burstThreshold ?? 4)) {
      this.triggerExponentialCooldown();
      return {
        allowed: false,
        waitMs: this.getRemainingLockMs(),
        state: this.state,
      };
    }

    // Refill tokens
    this.refillTokens();

    // Check active concurrency capacity
    if (this.activeJobs >= this.hardware.recommendedConcurrency) {
      return {
        allowed: false,
        waitMs: this.hardware.interTaskDelayMs,
        state: RateLimiterState.THROTTLED,
      };
    }

    // Evaluate token balance
    if (this.tokens >= taskCost) {
      this.tokens -= taskCost;
      this.state =
        this.tokens < 1 ? RateLimiterState.THROTTLED : RateLimiterState.ACTIVE;
      return { allowed: true, waitMs: 0, state: this.state };
    }

    const missingTokens = taskCost - this.tokens;
    const waitTimeMs = Math.ceil(missingTokens / this.refillRate);
    this.state = RateLimiterState.THROTTLED;
    return { allowed: false, waitMs: waitTimeMs, state: this.state };
  }

  /**
   * Applies Exponential Backoff with Jitter
   */
  private triggerExponentialCooldown(): void {
    this.state = RateLimiterState.LOCKED;
    const baseDuration = 1000; // 1s
    const exponent = Math.min(
      5,
      this.burstAttemptCount - (this.options.burstThreshold ?? 4) + 1
    );

    const rawBackoff = Math.min(
      this.options.maxLockDurationMs ?? 30000,
      baseDuration * Math.pow(2, exponent)
    );
    const jitteredDuration = Math.round(
      rawBackoff * (0.8 + Math.random() * 0.4)
    );

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lockUntilTimestamp = now + jitteredDuration;

    this.broadcastChannel?.postMessage({
      type: 'LOCKOUT_SYNC',
      payload: { durationMs: jitteredDuration },
    });
  }

  private applyRemoteLockout(durationMs: number): void {
    this.state = RateLimiterState.LOCKED;
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lockUntilTimestamp = now + durationMs;
  }

  public getRemainingLockMs(): number {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    return Math.max(0, Math.ceil(this.lockUntilTimestamp - now));
  }

  /**
   * Cooperatively executes a task, managing concurrency count and inter-task yielding
   */
  public async executeTask<T>(taskFn: () => Promise<T>): Promise<T> {
    const check = this.canExecute(1);
    if (!check.allowed) {
      throw new Error(
        `Rate limit exceeded. Status: ${check.state}. Wait ${check.waitMs}ms.`
      );
    }

    this.activeJobs++;
    this.broadcastChannel?.postMessage({
      type: 'JOB_ALLOCATION',
      payload: { delta: 1 },
    });

    try {
      const result = await taskFn();
      return result;
    } finally {
      await this.cooperativeYield();
      this.activeJobs = Math.max(0, this.activeJobs - 1);
      this.broadcastChannel?.postMessage({
        type: 'JOB_ALLOCATION',
        payload: { delta: -1 },
      });
    }
  }

  /**
   * Yields execution to the browser event loop to avoid main thread freezing
   */
  public async cooperativeYield(): Promise<void> {
    if (
      typeof window !== 'undefined' &&
      'scheduler' in window &&
      'yield' in
        (window as unknown as { scheduler: { yield: () => Promise<void> } })
          .scheduler
    ) {
      await (
        window as unknown as { scheduler: { yield: () => Promise<void> } }
      ).scheduler.yield();
    } else {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }

  /**
   * Solves lightweight Proof-of-Work micro-challenge (Hashcash SHA-256)
   * to unlock throttled states when legitimate burst is suspected
   */
  public async solvePoWChallenge(difficulty = 3): Promise<boolean> {
    if (typeof crypto === 'undefined' || !crypto.subtle) return true;

    const seed = 'mungil-pow-' + Math.random().toString(36).substring(2);
    const targetPrefix = '0'.repeat(difficulty);
    let nonce = 0;
    const encoder = new TextEncoder();

    while (nonce < 100_000) {
      const buffer = encoder.encode(`${seed}:${nonce}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (hashHex.startsWith(targetPrefix)) {
        this.burstAttemptCount = 0;
        this.state = RateLimiterState.IDLE;
        return true;
      }
      nonce++;

      if (nonce % 1000 === 0) {
        await this.cooperativeYield();
      }
    }
    return false;
  }

  public getHardwareProfile(): Readonly<HardwareProfile> {
    return this.hardware;
  }

  public getState(): RateLimiterState {
    return this.state;
  }

  public destroy(): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore
      }
      this.broadcastChannel = null;
    }
  }
}

export const dynamicRateLimiter = new DynamicRateLimiter();
