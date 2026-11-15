import { describe, it, expect, vi } from 'vitest';

vi.mock('./gemini-logging', () => ({
  GeminiLoggingService: { logGeminiCall: vi.fn(async () => undefined) },
}));
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: vi.fn() }));

import { GeminiClient } from './gemini';

type Internals = {
  generateText: (prompt: string) => Promise<string>;
  executePrompt: (prompt: string, transcript: string, customerName: string) => Promise<unknown>;
};

function clientReturning(text: string) {
  const client = new GeminiClient('test-key', 'gemini-test') as unknown as Internals;
  client.generateText = async () => text;
  return client;
}

describe('executePrompt response parsing (#153)', () => {
  it('returns the parsed object for valid JSON', async () => {
    const out = await clientReturning('```json\n{"customerName":"A","objectiveOverview":"x"}\n```').executePrompt('p', 't', 'A');
    expect(out).toMatchObject({ objectiveOverview: 'x' });
  });

  it('throws instead of returning a placeholder when the response is not valid JSON', async () => {
    await expect(
      clientReturning('<p>Here is your SOW</p>').executePrompt('p', 't', 'A')
    ).rejects.toThrow(/parse AI response/);
  });

  it('throws for malformed JSON that contains markup', async () => {
    await expect(
      clientReturning('{"objectiveOverview": <b>oops</b> }').executePrompt('p', 't', 'A')
    ).rejects.toThrow(/valid JSON/);
  });
});

describe('generateText request timeout (#155)', () => {
  it('passes an HTTP timeout to the SDK call', async () => {
    const generateContent = vi.fn(async () => ({ text: 'ok' }));
    const client = new GeminiClient('test-key', 'gemini-test');
    (client as unknown as { ai: unknown }).ai = { models: { generateContent } };
    await expect(client.generateText('hi')).resolves.toBe('ok');
    const arg = (generateContent.mock.calls[0] as unknown as [{ config?: { httpOptions?: { timeout?: number } } }])[0];
    expect(arg.config?.httpOptions?.timeout).toBeGreaterThan(0);
  });
});
