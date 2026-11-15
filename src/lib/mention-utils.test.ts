import { describe, it, expect } from 'vitest';
import { extractMentions } from './mention-utils';

describe('extractMentions (audit #221)', () => {
  it('extracts plain mentions', () => {
    expect(extractMentions('hi @john.doe and @jane-roe')).toEqual(['john.doe', 'jane-roe']);
  });

  it('does not treat the domain of an email address as a mention', () => {
    expect(extractMentions('mail john@leandata.com please')).toEqual([]);
  });

  it('still finds a mention next to an email', () => {
    expect(extractMentions('john@leandata.com cc @jane')).toEqual(['jane']);
  });

  it('strips trailing sentence punctuation', () => {
    expect(extractMentions('thanks @john.')).toEqual(['john']);
  });
});
