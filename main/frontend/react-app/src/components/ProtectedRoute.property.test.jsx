// Feature: html-to-react-migration, Property 1: Auth state drives protected route access
// Validates: Requirements 2.4, 3.2
//
// For any protected route and any auth state (authenticated or unauthenticated),
// the route should render its children if and only if the Firebase user is non-null;
// otherwise it should redirect to the login page.

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

// Arbitrary for a Firebase-like user object (non-null = authenticated)
const userArbitrary = fc.record({
  uid: fc.string({ minLength: 1, maxLength: 40 }),
  email: fc.string({ minLength: 1, maxLength: 50 }),
  displayName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
});

// Arbitrary for a redirectTo path
const redirectPathArbitrary = fc.constantFrom(
  '/user-auth',
  '/student-auth',
  '/teacher-auth',
  '/admin-auth'
);

function renderRoute(user, redirectTo) {
  useAuth.mockReturnValue({ user, loading: false });

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute redirectTo={redirectTo}>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          }
        />
        <Route path="/user-auth"    element={<div data-testid="redirect-target" />} />
        <Route path="/student-auth" element={<div data-testid="redirect-target" />} />
        <Route path="/teacher-auth" element={<div data-testid="redirect-target" />} />
        <Route path="/admin-auth"   element={<div data-testid="redirect-target" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Property 1: Auth state drives protected route access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children for any authenticated user across any redirect path', () => {
    fc.assert(
      fc.property(userArbitrary, redirectPathArbitrary, (user, redirectTo) => {
        const { unmount } = renderRoute(user, redirectTo);

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.queryByTestId('redirect-target')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('redirects to login for any unauthenticated state across any redirect path', () => {
    fc.assert(
      fc.property(redirectPathArbitrary, (redirectTo) => {
        const { unmount } = renderRoute(null, redirectTo);

        expect(screen.getByTestId('redirect-target')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('never renders protected content when user is null, regardless of redirectTo', () => {
    fc.assert(
      fc.property(redirectPathArbitrary, (redirectTo) => {
        const { unmount } = renderRoute(null, redirectTo);

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('never shows redirect target when user is authenticated', () => {
    fc.assert(
      fc.property(userArbitrary, redirectPathArbitrary, (user, redirectTo) => {
        const { unmount } = renderRoute(user, redirectTo);

        expect(screen.queryByTestId('redirect-target')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
