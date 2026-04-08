// Feature: html-to-react-migration
// Unit tests for UserAuth component

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UserAuth from './UserAuth';

vi.mock('../../firebase', () => ({
  auth: {},
  googleProvider: {},
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('../../api/api', () => ({
  registerUserInBackend: vi.fn(),
  sendOTP: vi.fn(),
  verifyOTP: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import { createUserWithEmailAndPassword } from '../../firebase';
import { sendOTP } from '../../api/api';

function renderUserAuth() {
  return render(
    <MemoryRouter>
      <UserAuth />
    </MemoryRouter>
  );
}

function goToSignup() {
  const signupLink = screen.getByText(/signup/i, { selector: 'a' });
  fireEvent.click(signupLink);
}

async function fillSignupForm(name, email, password) {
  fireEvent.change(screen.getByPlaceholderText(/enter your name/i), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: password } });
}

describe('UserAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows inline password validation errors for a weak password when signup form is submitted', async () => {
    renderUserAuth();
    goToSignup();

    await fillSignupForm('Test User', 'test@example.com', 'weak');

    fireEvent.submit(screen.getByRole('button', { name: /signup/i }));

    await waitFor(() => {
      expect(screen.getByTestId('password-errors')).toBeInTheDocument();
    });

    // Errors should be visible in the DOM
    const errorList = screen.getByTestId('password-errors');
    expect(errorList.children.length).toBeGreaterThan(0);
  });

  it('does not call createUserWithEmailAndPassword when password is invalid', async () => {
    renderUserAuth();
    goToSignup();

    await fillSignupForm('Test User', 'test@example.com', 'weak');

    fireEvent.submit(screen.getByRole('button', { name: /signup/i }));

    await waitFor(() => {
      expect(screen.getByTestId('password-errors')).toBeInTheDocument();
    });

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('shows OTP input view after a successful signup form submit', async () => {
    sendOTP.mockResolvedValue({ success: true });

    renderUserAuth();
    goToSignup();

    await fillSignupForm('Test User', 'test@example.com', 'StrongPass1!');

    fireEvent.submit(screen.getByRole('button', { name: /signup/i }));

    await waitFor(() => {
      expect(screen.getByText(/verify email/i)).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/enter 5-digit code/i)).toBeInTheDocument();
  });
});
