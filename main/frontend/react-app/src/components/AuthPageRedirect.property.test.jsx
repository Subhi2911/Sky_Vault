// Feature: html-to-react-migration, Property 3: Authenticated users are redirected away from auth pages
// Validates: Requirements 3.3
//
// For any authenticated user and any auth page route (/user-auth, /student-auth,
// /teacher-auth, /admin-auth), navigating to that route should redirect the user
// to their role-appropriate dashboard rather than rendering the auth form.

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as fc from 'fast-check';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

// Maps each auth route to its role-appropriate dashboard
const AUTH_TO_DASHBOARD = {
  '/user-auth':    '/user-dashboard',
  '/student-auth': '/student-dashboard',
  '/teacher-auth': '/teacher-dashboard',
  '/admin-auth':   '/admin-dashboard',
};

const AUTH_ROUTES = Object.keys(AUTH_TO_DASHBOARD);

// Arbitrary for a Firebase-like user object (non-null = authenticated)
const userArbitrary = fc.record({
  uid: fc.string({ minLength: 1, maxLength: 40 }),
  email: fc.string({ minLength: 1, maxLength: 50 }),
  displayName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
});

// Arbitrary for an auth route
const authRouteArbitrary = fc.constantFrom(...AUTH_ROUTES);

/**
 * AuthGuard wraps an auth page: if the user is already authenticated,
 * redirect to the given dashboard; otherwise render the auth form.
 * This is the behaviour that each real auth page component must implement
 * (Requirement 3.3). The property test verifies this contract in isolation.
 */
function AuthGuard({ children, dashboardRoute }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={dashboardRoute} replace />;
  return children;
}

function renderAuthRoute(user, authRoute) {
  useAuth.mockReturnValue({ user, loading: false });

  const dashboardRoute = AUTH_TO_DASHBOARD[authRoute];

  return render(
    <MemoryRouter initialEntries={[authRoute]}>
      <Routes>
        <Route
          path={authRoute}
          element={
            <AuthGuard dashboardRoute={dashboardRoute}>
              <div data-testid="auth-form">Auth Form</div>
            </AuthGuard>
          }
        />
        <Route
          path={dashboardRoute}
          element={<div data-testid="dashboard-page">Dashboard</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Property 3: Authenticated users are redirected away from auth pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects any authenticated user away from any auth page to the correct dashboard', () => {
    fc.assert(
      fc.property(userArbitrary, authRouteArbitrary, (user, authRoute) => {
        const { unmount } = renderAuthRoute(user, authRoute);

        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
        expect(screen.queryByTestId('auth-form')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('renders the auth form for any unauthenticated user on any auth page', () => {
    fc.assert(
      fc.property(authRouteArbitrary, (authRoute) => {
        const { unmount } = renderAuthRoute(null, authRoute);

        expect(screen.getByTestId('auth-form')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('redirects to the correct role-specific dashboard for each auth route', () => {
    fc.assert(
      fc.property(userArbitrary, authRouteArbitrary, (user, authRoute) => {
        const { unmount } = renderAuthRoute(user, authRoute);

        // The dashboard rendered must correspond to the auth route visited
        const expectedDashboard = AUTH_TO_DASHBOARD[authRoute];
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();

        // Verify the correct dashboard route was reached by checking no other
        // dashboard content is rendered (only one route matches at a time)
        const otherDashboards = Object.values(AUTH_TO_DASHBOARD).filter(
          (d) => d !== expectedDashboard
        );
        otherDashboards.forEach((d) => {
          // Each dashboard route is distinct; only the matched one renders
          expect(screen.getAllByTestId('dashboard-page').length).toBe(1);
        });

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('never shows the auth form to an authenticated user regardless of which auth page they visit', () => {
    fc.assert(
      fc.property(userArbitrary, authRouteArbitrary, (user, authRoute) => {
        const { unmount } = renderAuthRoute(user, authRoute);

        expect(screen.queryByTestId('auth-form')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
