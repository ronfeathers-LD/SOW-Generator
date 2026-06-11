/**
 * Deploy-environment detection — single source of truth.
 *
 * Railway injects RAILWAY_ENVIRONMENT_NAME ("staging" | "production") into
 * each environment automatically; NEXT_PUBLIC_APP_ENV is an explicit override
 * for anything Railway doesn't cover. Local dev matches neither.
 *
 * Read lazily (not at module load) so the values reflect the current
 * process.env at call time — important for tests and for server code paths
 * that mutate env after startup.
 */

export function getDeployEnvironment(): string | undefined {
  return process.env.NEXT_PUBLIC_APP_ENV ?? process.env.RAILWAY_ENVIRONMENT_NAME;
}

export function isStagingDeploy(): boolean {
  return getDeployEnvironment() === 'staging';
}
