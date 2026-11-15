import { describe, it, expect, vi } from 'vitest';
import { hasSalesforceErrorCode, SalesforceClient } from './salesforce';

describe('hasSalesforceErrorCode (#242)', () => {
  it('matches jsforce errors by errorCode even when the message is reworded', () => {
    const err = Object.assign(new Error('authentication failure'), { errorCode: 'INVALID_LOGIN' });
    expect(hasSalesforceErrorCode(err, 'INVALID_LOGIN')).toBe(true);
    expect(hasSalesforceErrorCode(err, 'INVALID_GRANT')).toBe(false);
  });

  it('matches jsforce errors by name', () => {
    const err = new Error('nope');
    err.name = 'INVALID_GRANT';
    expect(hasSalesforceErrorCode(err, 'INVALID_GRANT')).toBe(true);
  });

  it('falls back to the message for plain Errors', () => {
    expect(hasSalesforceErrorCode(new Error('INVALID_LOGIN: Invalid username'), 'INVALID_LOGIN')).toBe(true);
    expect(hasSalesforceErrorCode(new Error('network down'), 'INVALID_LOGIN')).toBe(false);
  });

  it('returns false for non-objects', () => {
    expect(hasSalesforceErrorCode(undefined, 'INVALID_LOGIN')).toBe(false);
    expect(hasSalesforceErrorCode('INVALID_LOGIN', 'INVALID_LOGIN')).toBe(false);
  });
});

describe('SalesforceClient.authenticate error classification (#242)', () => {
  it('retries with password only when the code is on errorCode, not the message', async () => {
    const login = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('auth failed'), { errorCode: 'INVALID_LOGIN' }))
      .mockRejectedValueOnce(Object.assign(new Error('auth failed'), { errorCode: 'INVALID_LOGIN' }));
    const client = new SalesforceClient();
    (client as unknown as { conn: unknown }).conn = { login };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(client.authenticate('u', 'p', 'tok')).rejects.toThrow('Invalid username or password');
    expect(login).toHaveBeenCalledTimes(2);
  });
});
