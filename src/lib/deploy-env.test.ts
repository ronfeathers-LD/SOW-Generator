import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getDeployEnvironment, isStagingDeploy } from './deploy-env';

const ORIGINAL_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const ORIGINAL_RAILWAY_ENV = process.env.RAILWAY_ENVIRONMENT_NAME;

function restore(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe('deploy-env', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.RAILWAY_ENVIRONMENT_NAME;
  });

  afterAll(() => {
    restore('NEXT_PUBLIC_APP_ENV', ORIGINAL_APP_ENV);
    restore('RAILWAY_ENVIRONMENT_NAME', ORIGINAL_RAILWAY_ENV);
  });

  describe('getDeployEnvironment', () => {
    it('returns undefined when neither env var is set', () => {
      expect(getDeployEnvironment()).toBeUndefined();
    });

    it('returns RAILWAY_ENVIRONMENT_NAME when only Railway injects it', () => {
      process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
      expect(getDeployEnvironment()).toBe('production');
    });

    it('returns NEXT_PUBLIC_APP_ENV when only the override is set', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'staging';
      expect(getDeployEnvironment()).toBe('staging');
    });

    it('prefers NEXT_PUBLIC_APP_ENV over RAILWAY_ENVIRONMENT_NAME', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
      expect(getDeployEnvironment()).toBe('production');
    });

    it('reads env lazily — reflects changes made after module load', () => {
      expect(getDeployEnvironment()).toBeUndefined();
      process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
      expect(getDeployEnvironment()).toBe('staging');
    });
  });

  describe('isStagingDeploy', () => {
    it('is false when no environment is detected (local dev)', () => {
      expect(isStagingDeploy()).toBe(false);
    });

    it('is true when Railway reports staging', () => {
      process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
      expect(isStagingDeploy()).toBe(true);
    });

    it('is true when the override is staging', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'staging';
      expect(isStagingDeploy()).toBe(true);
    });

    it('is false for production', () => {
      process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
      expect(isStagingDeploy()).toBe(false);
    });

    it('is false when the override masks a staging Railway env', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
      expect(isStagingDeploy()).toBe(false);
    });
  });
});
