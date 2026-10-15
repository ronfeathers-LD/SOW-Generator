import { describe, it, expect } from 'vitest';
import { validateSalesforceConfigInput, stripSalesforceSecrets } from './salesforce-config-validation';

describe('validateSalesforceConfigInput', () => {
  it('defaults to the password method when authMethod is absent', () => {
    const r = validateSalesforceConfigInput({ username: 'u@x.com', password: 'pw', securityToken: 'tok' });
    expect(r).toEqual({
      ok: true,
      value: {
        authMethod: 'password',
        username: 'u@x.com',
        password: 'pw',
        securityToken: 'tok',
        clientId: null,
        clientSecret: null,
        loginUrl: 'https://login.salesforce.com',
      },
    });
  });

  it('requires username and password for the password method', () => {
    expect(validateSalesforceConfigInput({ authMethod: 'password', username: 'u' }).ok).toBe(false);
    expect(validateSalesforceConfigInput({ authMethod: 'password', password: 'p' }).ok).toBe(false);
  });

  it('accepts a complete client_credentials config and drops password fields', () => {
    const r = validateSalesforceConfigInput({
      authMethod: 'client_credentials',
      username: 'integration@x.com',
      clientId: 'key',
      clientSecret: 'sec',
      loginUrl: 'https://leandata.my.salesforce.com',
      password: 'stale',
      securityToken: 'stale',
    });
    expect(r).toEqual({
      ok: true,
      value: {
        authMethod: 'client_credentials',
        username: 'integration@x.com',
        password: null,
        securityToken: null,
        clientId: 'key',
        clientSecret: 'sec',
        loginUrl: 'https://leandata.my.salesforce.com',
      },
    });
  });

  it.each(['username', 'clientId', 'clientSecret', 'loginUrl'])(
    'rejects client_credentials missing %s',
    (field) => {
      const input: Record<string, unknown> = {
        authMethod: 'client_credentials',
        username: 'integration@x.com',
        clientId: 'key',
        clientSecret: 'sec',
        loginUrl: 'https://leandata.my.salesforce.com',
      };
      delete input[field];
      expect(validateSalesforceConfigInput(input).ok).toBe(false);
    }
  );

  it('does not default the login URL for client_credentials', () => {
    expect(
      validateSalesforceConfigInput({ authMethod: 'client_credentials', username: 'u', clientId: 'k', clientSecret: 's' }).ok
    ).toBe(false);
  });

  it('rejects an unknown authMethod', () => {
    expect(validateSalesforceConfigInput({ authMethod: 'saml', username: 'u', password: 'p' }).ok).toBe(false);
  });
});

describe('stripSalesforceSecrets', () => {
  it('removes password and client_secret but keeps the rest', () => {
    const safe = stripSalesforceSecrets({ id: '1', username: 'u', password: 'p', client_secret: 's', client_id: 'k' });
    expect(safe).toEqual({ id: '1', username: 'u', client_id: 'k' });
  });
});
