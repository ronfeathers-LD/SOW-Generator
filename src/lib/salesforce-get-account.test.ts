import { describe, it, expect, vi } from 'vitest';
import { SalesforceClient } from './salesforce';

const ID = '001000000000001AAA';

function clientWith(record: Record<string, unknown>) {
  const query = vi.fn(async () => ({ records: [record] }));
  const client = new SalesforceClient();
  (client as unknown as { conn: unknown }).conn = { query };
  return { client, query };
}

describe('SalesforceClient.getAccount segment (#241)', () => {
  it('derives the segment from a single query and does not leak NumberOfEmployees', async () => {
    const { client, query } = clientWith({ Id: ID, Name: 'Acme', NumberOfEmployees: 2000 });
    const account = await client.getAccount(ID);
    expect(query).toHaveBeenCalledTimes(1);
    expect(account.Employee_Band__c).toBe('EE');
    expect('NumberOfEmployees' in account).toBe(false);
  });

  it('keeps the Salesforce-provided band when present', async () => {
    const { client, query } = clientWith({ Id: ID, Name: 'Acme', Employee_Band__c: 'MM', NumberOfEmployees: 9000 });
    const account = await client.getAccount(ID);
    expect(query).toHaveBeenCalledTimes(1);
    expect(account.Employee_Band__c).toBe('MM');
  });
});
