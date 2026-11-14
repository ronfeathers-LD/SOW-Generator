/**
 * Bounded-concurrency helpers for fan-out to external APIs (Avoma, Slack,
 * Google Drive), so we parallelize without flooding the upstream.
 */

const DEFAULT_CONCURRENCY = 5;

/**
 * Returns `run(fn)`, which executes `fn` once fewer than `limit` calls started
 * through the same limiter are in flight, and resolves/rejects with its result.
 * Share one limiter across recursive work to bound the whole tree.
 */
export function createLimiter(limit: number = DEFAULT_CONCURRENCY) {
  const max = Math.max(1, Math.floor(limit));
  let active = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    active--;
    waiting.shift()?.();
  };

  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) {
      await new Promise<void>(resolve => waiting.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

/**
 * Like `Promise.all(items.map(fn))` but with at most `limit` calls in flight.
 * Results keep the input order. Rejects with the first error, like Promise.all.
 */
export function mapWithConcurrency<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  limit: number = DEFAULT_CONCURRENCY
): Promise<R[]> {
  const run = createLimiter(limit);
  return Promise.all(items.map((item, index) => run(() => fn(item, index))));
}
