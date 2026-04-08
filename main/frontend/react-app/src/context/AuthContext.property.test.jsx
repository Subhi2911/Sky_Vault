// Feature: html-to-react-migration, Property 2: Auth state change propagates within 500 ms

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AuthProvider, useAuth } from './AuthContext';

// --- Mock firebase modules ---
let authStateCallback = null;

vi.mock('../firebase', () => ({
  auth: {},
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    authStateCallback = callback;
    return vi.fn();
  }),
}));

// Helper component that captures auth state via ref
function AuthCapture({ stateRef }) {
  const { user, loading } = useAuth();
  stateRef.current = { user, loading };
  return null;
}

function renderWithAuth() {
  const stateRef = { current: null };
  render(
    <AuthProvider>
      <AuthCapture stateRef={stateRef} />
    </AuthProvider>
  );
  return stateRef;
}

beforeEach(() => {
  authStateCallback = null;
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Arbitrary for a Firebase-like user object
const userArbitrary = fc.record({
  uid: fc.string({ minLength: 1, maxLength: 40 }),
  email: fc.string({ minLength: 1, maxLength: 50 }),
  displayName: fc.string({ minLength: 0, maxLength: 50 }),
});

/**
 * Property 2: Auth state change propagates within 500 ms
 * Validates: Requirements 2.3
 */
describe('AuthContext Property 2: Auth state change propagates within 500 ms', () => {
  it('sign-in: user state reflects new user within 500ms', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, async (generatedUser) => {
        authStateCallback = null;
        vi.clearAllMocks();

        const stateRef = renderWithAuth();

        // Simulate Firebase firing auth state change with a user
        await act(async () => {
          authStateCallback(generatedUser);
          vi.advanceTimersByTime(500);
        });

        expect(stateRef.current.user).toEqual(generatedUser);
        expect(stateRef.current.loading).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('sign-out: user state becomes null within 500ms', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, async (generatedUser) => {
        authStateCallback = null;
        vi.clearAllMocks();

        const stateRef = renderWithAuth();

        // First sign in
        await act(async () => {
          authStateCallback(generatedUser);
          vi.advanceTimersByTime(500);
        });

        expect(stateRef.current.user).toEqual(generatedUser);

        // Then sign out — Firebase fires callback with null
        await act(async () => {
          authStateCallback(null);
          vi.advanceTimersByTime(500);
        });

        expect(stateRef.current.user).toBeNull();
        expect(stateRef.current.loading).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
