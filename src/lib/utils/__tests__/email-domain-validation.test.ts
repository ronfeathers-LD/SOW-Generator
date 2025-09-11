/**
 * Tests for email domain validation utilities
 */

import { 
  validateLeandataEmail, 
  filterValidLeandataEmails, 
  validateLeandataEmailOrThrow,
  logInvalidEmailWarning 
} from '../email-domain-validation';

describe('Email Domain Validation', () => {
  describe('validateLeandataEmail', () => {
    it('should return true for valid @leandata.com emails', () => {
      expect(validateLeandataEmail('user@leandata.com')).toBe(true);
      expect(validateLeandataEmail('john.doe@leandata.com')).toBe(true);
      expect(validateLeandataEmail('test+tag@leandata.com')).toBe(true);
    });

    it('should return false for non-leandata domains', () => {
      expect(validateLeandataEmail('user@gmail.com')).toBe(false);
      expect(validateLeandataEmail('user@example.com')).toBe(false);
      expect(validateLeandataEmail('user@leandata.org')).toBe(false);
      expect(validateLeandataEmail('user@company.com')).toBe(false);
    });

    it('should return false for invalid email formats', () => {
      expect(validateLeandataEmail('')).toBe(false);
      expect(validateLeandataEmail('invalid-email')).toBe(false);
      expect(validateLeandataEmail('user@')).toBe(false);
      expect(validateLeandataEmail('@leandata.com')).toBe(false);
      expect(validateLeandataEmail(null as unknown as string)).toBe(false);
      expect(validateLeandataEmail(undefined as unknown as string)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(validateLeandataEmail('USER@LEANDATA.COM')).toBe(true);
      expect(validateLeandataEmail('User@LeanData.COM')).toBe(true);
    });
  });

  describe('filterValidLeandataEmails', () => {
    it('should filter to only @leandata.com emails', () => {
      const emails = [
        'user@leandata.com',
        'john@gmail.com',
        'jane@leandata.com',
        'bob@example.com'
      ];
      
      const result = filterValidLeandataEmails(emails);
      expect(result).toEqual(['user@leandata.com', 'jane@leandata.com']);
    });

    it('should return empty array for invalid input', () => {
      expect(filterValidLeandataEmails([])).toEqual([]);
      expect(filterValidLeandataEmails(null as unknown as string[])).toEqual([]);
      expect(filterValidLeandataEmails(undefined as unknown as string[])).toEqual([]);
    });

    it('should return empty array when no valid emails', () => {
      const emails = ['user@gmail.com', 'john@example.com'];
      expect(filterValidLeandataEmails(emails)).toEqual([]);
    });
  });

  describe('validateLeandataEmailOrThrow', () => {
    it('should not throw for valid @leandata.com emails', () => {
      expect(() => validateLeandataEmailOrThrow('user@leandata.com')).not.toThrow();
      expect(() => validateLeandataEmailOrThrow('user@leandata.com', 'test')).not.toThrow();
    });

    it('should throw for invalid emails', () => {
      expect(() => validateLeandataEmailOrThrow('user@gmail.com')).toThrow();
      expect(() => validateLeandataEmailOrThrow('user@gmail.com', 'recipient')).toThrow('Invalid recipient email address');
      expect(() => validateLeandataEmailOrThrow('')).toThrow();
    });
  });

  describe('logInvalidEmailWarning', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log warning message', () => {
      logInvalidEmailWarning('user@gmail.com', 'test context');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚫 Blocked messaging to non-Leandata email: user@gmail.com (test context). Only @leandata.com addresses are allowed.'
      );
    });
  });
});
