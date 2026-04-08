// Feature: html-to-react-migration
// Tests for AuthContext: loading state, user sign-in, user sign-out

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    // Return unsubscribe function
    return vi.fn();
  }),
}));

// Helper component that renders auth state for assertions
function AuthConsumer() {
  const { user, loading } = useAuth();
  if (loading) return <div data-testid="spinner">Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

beforeEach(() => {
  authStateCallback = null;
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  it('renders loading spinner while resolving initial auth state', () => {
    // onAuthStateChanged callback is not called yet — loading stays true
    renderWithAuth();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('exposes user object after sign-in event', async () => {
    renderWithAuth();

    // Simulate Firebase firing the auth state change with a user
    await act(async () => {
      authStateCallback({ email: 'test@example.com', uid: 'uid-123' });
    });

    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  it('sets user to null after sign-out event', async () => {
    renderWithAuth();

    // First sign in
    await act(async () => {
      authStateCallback({ email: 'test@example.com', uid: 'uid-123' });
    });
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');

    // Then sign out — Firebase fires callback with null
    await act(async () => {
      authStateCallback(null);
    });

    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });
});
