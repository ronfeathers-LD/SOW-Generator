export type SalesforceAuthMethod = 'password' | 'client_credentials';

export interface SalesforceConfigInput {
  authMethod?: unknown;
  username?: unknown;
  password?: unknown;
  securityToken?: unknown;
  clientId?: unknown;
  clientSecret?: unknown;
  loginUrl?: unknown;
}

export interface ValidatedSalesforceConfig {
  authMethod: SalesforceAuthMethod;
  username: string;
  password: string | null;
  securityToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  loginUrl: string;
}

export type SalesforceConfigValidation =
  | { ok: true; value: ValidatedSalesforceConfig }
  | { ok: false; error: string };

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Validate a Salesforce config save request. A missing authMethod means
 * 'password' so older clients keep working. Fields that do not belong to the
 * chosen method are dropped (null) so a row never carries stale credentials.
 */
export function validateSalesforceConfigInput(input: SalesforceConfigInput): SalesforceConfigValidation {
  const rawMethod = input.authMethod ?? 'password';
  if (rawMethod !== 'password' && rawMethod !== 'client_credentials') {
    return { ok: false, error: 'authMethod must be "password" or "client_credentials"' };
  }

  const username = str(input.username);
  // Secrets are kept verbatim (no trimming), as the password always was.
  const password = typeof input.password === 'string' ? input.password : '';
  const clientId = str(input.clientId);
  const clientSecret = typeof input.clientSecret === 'string' ? input.clientSecret : '';
  const securityToken = str(input.securityToken);
  const loginUrl = str(input.loginUrl);

  if (rawMethod === 'client_credentials') {
    if (!username || !clientId || !clientSecret || !loginUrl) {
      return {
        ok: false,
        error: 'Run-as username, consumer key, consumer secret and login URL are required for client credentials',
      };
    }
    return {
      ok: true,
      value: {
        authMethod: 'client_credentials',
        username,
        password: null,
        securityToken: null,
        clientId,
        clientSecret,
        loginUrl,
      },
    };
  }

  if (!username || !password) {
    return { ok: false, error: 'Username and password are required' };
  }
  return {
    ok: true,
    value: {
      authMethod: 'password',
      username,
      password,
      securityToken: securityToken || null,
      clientId: null,
      clientSecret: null,
      loginUrl: loginUrl || 'https://login.salesforce.com',
    },
  };
}

/** Remove secrets from a salesforce_configs row before returning it to the browser. */
export function stripSalesforceSecrets<T extends Record<string, unknown>>(
  config: T
): Omit<T, 'password' | 'client_secret'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _p, client_secret: _s, ...safe } = config;
  return safe;
}
