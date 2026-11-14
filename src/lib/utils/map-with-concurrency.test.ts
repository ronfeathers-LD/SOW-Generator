import { describe, it, expect } from 'vitest';
import { createLimiter, mapWithConcurrency } from './map-with-concurrency';

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 5));

describe('mapWithConcurrency', () => {
  it('preserves input order regardless of completion order', async () => {
    const out = await mapWithConcurrency([30, 1, 15], async n => {
      await new Promise(r => setTimeout(r, n));
      return n * 2;
    }, 2);
    expect(out).toEqual([60, 2, 30]);
  });

  it('never exceeds the concurrency limit and does reach it', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), async () => {
      active++;
      peak = Math.max(peak, active);
      await tick();
      active--;
    }, 5);
    expect(peak).toBe(5);
  });

  it('rejects with the first error', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], async n => {
        if (n === 2) throw new Error('boom');
        return n;
      })
    ).rejects.toThrow('boom');
  });

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], async () => 1)).toEqual([]);
  });
});

describe('createLimiter', () => {
  it('releases the slot when a task fails so queued tasks still run', async () => {
    const run = createLimiter(1);
    const failing = run(async () => { throw new Error('x'); });
    const next = run(async () => 'ok');
    await expect(failing).rejects.toThrow('x');
    await expect(next).resolves.toBe('ok');
  });

  it('bounds work shared across recursive calls without deadlocking', async () => {
    const run = createLimiter(2);
    let active = 0;
    let peak = 0;
    const visit = async (depth: number): Promise<number> => {
      await run(async () => {
        active++;
        peak = Math.max(peak, active);
        await tick();
        active--;
      });
      if (depth === 0) return 1;
      const kids = await Promise.all([visit(depth - 1), visit(depth - 1), visit(depth - 1)]);
      return 1 + kids.reduce((a, b) => a + b, 0);
    };
    expect(await visit(3)).toBe(40);
    expect(peak).toBe(2);
  });
});
