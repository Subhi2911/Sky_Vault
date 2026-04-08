// Feature: html-to-react-migration, Integration tests: Full route flows
// Validates: Requirements 3.2, 3.3, 3.4

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mock firebase.js ---
vi.mock('./firebase', () => ({
  auth: {},
  googleProvider: {},
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  updateEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

// --- Mock firebase/auth (onAuthStateChanged) ---
import { onAuthStateChanged } from 'firebase/auth';
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  updateEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

// --- Mock firebase/app ---
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

// --- Mock api ---
vi.mock('./api/api', () => ({
  registerUserInBackend: vi.fn(),
  sendOTP: vi.fn(),
  verifyOTP: vi.fn(),
  getFiles: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getUserProfile: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  updateUserProfile: vi.fn(),
}));

// --- Mock all page components as simple stubs ---
vi.mock('./pages/Landing', () => ({
  default: () => <div data-testid="landing-page">Landing</div>,
}));

vi.mock('./pages/auth/UserAuth', () => ({
  default: () => <div data-testid="user-auth-page">UserAuth</div>,
}));

vi.mock('./pages/auth/StudentAuth', () => ({
  default: () => <div data-testid="student-auth-page">StudentAuth</div>,
}));

vi.mock('./pages/auth/TeacherAuth', () => ({
  default: () => <div data-testid="teacher-auth-page">TeacherAuth</div>,
}));

vi.mock('./pages/auth/AdminAuth', () => ({
  default: () => <div data-testid="admin-auth-page">AdminAuth</div>,
}));

vi.mock('./pages/dashboards/UserDashboard', () => ({
  default: () => <div data-testid="user-dashboard-page">UserDashboard</div>,
}));

vi.mock('./pages/dashboards/StudentDashboard', () => ({
  default: () => <div data-testid="student-dashboard-page">StudentDashboard</div>,
}));

vi.mock('./pages/dashboards/TeacherDashboard', () => ({
  default: () => <div data-testid="teacher-dashboard-page">TeacherDashboard</div>,
}));

vi.mock('./pages/dashboards/AdminDashboard', () => ({
  default: () => <div data-testid="admin-dashboard-page">AdminDashboard</div>,
}));

vi.mock('./pages/dashboards/SuperadminDashboard', () => ({
  default: () => <div data-testid="superadmin-dashboard-page">SuperadminDashboard</div>,
}));

vi.mock('./pages/onboarding/OrganizationId', () => ({
  default: () => <div data-testid="organization-id-page">OrganizationId</div>,
}));

vi.mock('./pages/onboarding/OrganizationRole', () => ({
  default: () => <div data-testid="organization-role-page">OrganizationRole</div>,
}));

vi.mock('./pages/UserProfile', () => ({
  default: () => <div data-testid="user-profile-page">UserProfile</div>,
}));

vi.mock('./pages/NotFound', () => ({
  default: () => <div data-testid="not-found-page">NotFound</div>,
}));

import App from './App';

describe('App integration — full route flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Requirement 3.2 — unauthenticated user visiting /user-dashboard is redirected to /user-auth', async () => {
    // Arrange: no authenticated user
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null); // unauthenticated
      return () => {};
    });

    window.history.pushState({}, '', '/user-dashboard');

    // Act
    render(<App />);

    // Assert: ProtectedRoute redirects to /user-auth
    await waitFor(() => {
      expect(screen.getByTestId('user-auth-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('user-dashboard-page')).not.toBeInTheDocument();
  });

  it('Requirement 3.3 — authenticated user visiting /user-auth sees the UserAuth page (redirect handled by UserAuth itself)', async () => {
    // Arrange: authenticated user
    const fakeUser = { uid: 'test-uid', email: 'test@example.com', displayName: 'Test User' };
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(fakeUser); // authenticated
      return () => {};
    });

    // UserAuth is mocked as a stub — in the real app it does <Navigate to="/user-dashboard" />
    // when user is authenticated. Here we verify the route renders UserAuth at /user-auth.
    // The redirect logic is tested at the UserAuth component level in its own tests.
    window.history.pushState({}, '', '/user-auth');

    // Act
    render(<App />);

    // Assert: /user-auth route renders the UserAuth component (stub)
    await waitFor(() => {
      expect(screen.getByTestId('user-auth-page')).toBeInTheDocument();
    });
  });

  it('Requirement 3.4 — unknown route renders NotFound (404 fallback)', async () => {
    // Arrange: auth state doesn't matter for 404
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });

    window.history.pushState({}, '', '/some-nonexistent-route-xyz');

    // Act
    render(<App />);

    // Assert: wildcard route renders NotFound
    await waitFor(() => {
      expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
    });
  });
});
