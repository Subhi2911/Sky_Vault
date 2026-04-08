// Feature: html-to-react-migration
// Tests for ProtectedRoute: spinner while loading, redirect when unauthenticated, renders children when authenticated

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock AuthContext so we can control user/loading state per test
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

function renderProtectedRoute({ redirectTo } = {}) {
  const props = redirectTo ? { redirectTo } : {};
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute {...props}>
              <div data-testid="protected-content">Secret</div>
            </ProtectedRoute>
          }
        />
        <Route path="/user-auth" element={<div data-testid="user-auth-page">Auth</div>} />
        <Route path="/student-auth" element={<div data-testid="student-auth-page">Student Auth</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders spinner while loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    renderProtectedRoute();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to default auth page', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    renderProtectedRoute();

    expect(screen.getByTestId('user-auth-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to custom redirectTo page', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    renderProtectedRoute({ redirectTo: '/student-auth' });

    expect(screen.getByTestId('student-auth-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children for authenticated user', () => {
    useAuth.mockReturnValue({ user: { uid: 'uid-123', email: 'user@example.com' }, loading: false });

    renderProtectedRoute();

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
