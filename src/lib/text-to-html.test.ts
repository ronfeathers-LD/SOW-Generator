import { describe, it, expect } from 'vitest';
import { processContent } from './text-to-html';

describe('processContent list styling', () => {
  it('does not duplicate class attributes on existing lists', () => {
    const out = processContent('<ul><li class="x">a</li></ul>');
    expect(out).toBe('<ul class="list-disc pl-6 prose prose-md max-w-none"><li class="x">a</li></ul>');
  });

  it('adds classes to tags that have none', () => {
    const out = processContent('<ul><li>a</li></ul>');
    expect(out).toBe('<ul class="list-disc pl-6 prose prose-md max-w-none"><li class="mb-1">a</li></ul>');
  });

  it('wraps multi-line orphan <li> elements', () => {
    const out = processContent('<li>one\ntwo</li>\n<li>three</li>');
    expect(out.startsWith('<ul')).toBe(true);
    expect(out).toContain('one\ntwo');
    expect(out.match(/<ul/g)?.length).toBe(1);
    expect(out.match(/class="list-disc/g)?.length).toBe(1);
  });
});
