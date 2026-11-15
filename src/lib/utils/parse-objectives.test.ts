import { describe, it, expect } from 'vitest';
import { parseObjectives } from './parse-objectives';

describe('parseObjectives', () => {
  it('drops non-string entries from arrays', () => {
    expect(parseObjectives(['a', null, 3, 'b'])).toEqual(['a', 'b']);
  });
  it('drops non-string entries from JSON arrays', () => {
    expect(parseObjectives('["a", 1, null, "b"]')).toEqual(['a', 'b']);
  });
});
