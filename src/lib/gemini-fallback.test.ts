import { describe, expect, it } from 'vitest';
import { ApiError } from '@google/genai';
import { GeminiClient, shouldTryNextModel } from './gemini';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from './gemini-models';

const apiError = (status: number) => new ApiError({ status, message: `HTTP ${status}` });

describe('shouldTryNextModel', () => {
  it.each([503, 429, 404])('moves to the next model on HTTP %i', (status) => {
    expect(shouldTryNextModel(apiError(status))).toBe(true);
  });

  it.each([400, 401, 403, 500])('stops on HTTP %i', (status) => {
    expect(shouldTryNextModel(apiError(status))).toBe(false);
  });

  it('moves on for the reworded overload error analyzeTranscription throws', () => {
    expect(shouldTryNextModel(new Error('Model is currently overloaded. Please try again later.'))).toBe(true);
  });

  it('stops on an invalid-key error', () => {
    expect(shouldTryNextModel(new Error('API key is invalid or expired. Please check your configuration.'))).toBe(false);
  });

  it('stops on non-Error values', () => {
    expect(shouldTryNextModel('503')).toBe(false);
  });
});

describe('Gemini model list', () => {
  it('offers the default model and uses the list as the fallback order', () => {
    expect(GEMINI_MODELS.map(m => m.value)).toContain(DEFAULT_GEMINI_MODEL);
    expect(GeminiClient.getAvailableModels()).toEqual(GEMINI_MODELS.map(m => m.value));
  });
});
