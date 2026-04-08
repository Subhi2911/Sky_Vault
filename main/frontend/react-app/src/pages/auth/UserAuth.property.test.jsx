// Feature: html-to-react-migration, Property 14: Password validation rejects weak passwords
// Validates: Requirements 5.8

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePassword } from './UserAuth';

describe('Property 14: Password validation rejects weak passwords', () => {
  it('returns isValid: false and non-empty errors for passwords that are too short', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 5 }),
        (password) => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns isValid: false and non-empty errors for passwords missing uppercase', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]{6,}$/).filter(
          (p) => !/[A-Z]/.test(p)
        ),
        (password) => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns isValid: false and non-empty errors for passwords missing a digit', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]{6,}$/).filter(
          (p) => !/[0-9]/.test(p)
        ),
        (password) => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns isValid: false and non-empty errors for passwords missing a special character', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9]{6,}$/).filter(
          (p) => !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(p)
        ),
        (password) => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns isValid: false for any password failing at least one rule (general)', () => {
    fc.assert(
      fc.property(
        fc.string().filter((p) => {
          const hasLen = p.length >= 6;
          const hasUpper = /[A-Z]/.test(p);
          const hasDigit = /[0-9]/.test(p);
          const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(p);
          return !(hasLen && hasUpper && hasDigit && hasSpecial);
        }),
        (password) => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
