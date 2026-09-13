const RATE_LIMIT_STORAGE_KEY = 'maxplay_auth_rate_limits';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds cooldown

interface RateLimitRecord {
  attempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

// In-memory fallback in case localStorage is restricted
const memoryLimits: Record<string, RateLimitRecord> = {};

function getStore(): Record<string, RateLimitRecord> {
  try {
    const data = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return memoryLimits;
  }
}

function saveStore(store: Record<string, RateLimitRecord>) {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // fallback to memory
    Object.assign(memoryLimits, store);
  }
}

/**
 * Check if an email account is currently rate-limited (locked)
 */
export function checkLoginRateLimit(rawEmail: string): {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  maxAttempts: number;
} {
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return { isLocked: false, remainingSeconds: 0, attempts: 0, maxAttempts: MAX_FAILED_ATTEMPTS };
  }

  const store = getStore();
  const record = store[email];

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, attempts: 0, maxAttempts: MAX_FAILED_ATTEMPTS };
  }

  const now = Date.now();

  // Check if locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      attempts: record.attempts,
      maxAttempts: MAX_FAILED_ATTEMPTS,
    };
  }

  // If lock has expired, reset attempts
  if (record.lockedUntil && record.lockedUntil <= now) {
    delete store[email];
    saveStore(store);
    return { isLocked: false, remainingSeconds: 0, attempts: 0, maxAttempts: MAX_FAILED_ATTEMPTS };
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    attempts: record.attempts || 0,
    maxAttempts: MAX_FAILED_ATTEMPTS,
  };
}

/**
 * Record a failed login attempt for an email account.
 * Triggers rate limit lockout if consecutive failures reach MAX_FAILED_ATTEMPTS.
 */
export function recordFailedAttempt(rawEmail: string): {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  remainingAttempts: number;
} {
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return { isLocked: false, remainingSeconds: 0, attempts: 1, remainingAttempts: MAX_FAILED_ATTEMPTS - 1 };
  }

  const store = getStore();
  const now = Date.now();
  const record: RateLimitRecord = store[email] || {
    attempts: 0,
    lockedUntil: null,
    lastAttempt: now,
  };

  // If last attempt was more than 15 minutes ago, reset counter
  if (now - record.lastAttempt > 15 * 60 * 1000 && !record.lockedUntil) {
    record.attempts = 0;
  }

  record.attempts += 1;
  record.lastAttempt = now;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    store[email] = record;
    saveStore(store);

    return {
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attempts: record.attempts,
      remainingAttempts: 0,
    };
  }

  store[email] = record;
  saveStore(store);

  return {
    isLocked: false,
    remainingSeconds: 0,
    attempts: record.attempts,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts),
  };
}

/**
 * Reset failed attempts on successful login
 */
export function resetLoginAttempts(rawEmail: string): void {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return;

  const store = getStore();
  if (store[email]) {
    delete store[email];
    saveStore(store);
  }
}
