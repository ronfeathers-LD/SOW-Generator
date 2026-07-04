import { describe, expect, it } from 'vitest';
import { filterContacts } from './filter-contacts';

const contacts = [
  { Name: 'Adam Goldberg', Email: 'agoldberg@openai.com', Title: 'Account Director' },
  { Name: 'Aliisa Rosenthal', Email: 'aliisa@openai.com', Title: 'Head of Sales' },
  { Name: 'Andrew Simon', Email: 'andrew.simon@c-openai.com', Title: undefined },
];

describe('filterContacts', () => {
  it('returns all contacts for an empty or whitespace query', () => {
    expect(filterContacts(contacts, '')).toHaveLength(3);
    expect(filterContacts(contacts, '   ')).toHaveLength(3);
  });

  it('matches name case-insensitively', () => {
    expect(filterContacts(contacts, 'adam')).toEqual([contacts[0]]);
  });

  it('matches email and title', () => {
    expect(filterContacts(contacts, 'c-openai')).toEqual([contacts[2]]);
    expect(filterContacts(contacts, 'head of sales')).toEqual([contacts[1]]);
  });

  it('handles contacts with missing fields', () => {
    expect(filterContacts(contacts, 'director')).toEqual([contacts[0]]);
  });
});
