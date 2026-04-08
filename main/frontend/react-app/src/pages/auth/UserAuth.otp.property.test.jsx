// Feature: html-to-react-migration, Property 15: OTP flow gates account creation
// Validates: Requirements 5.3, 5.5

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
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
  sendOTP: vi.fn().mockResolvedValue({ success: true }),
  verifyOTP: vi.fn().mockResolvedValue({ success: false, data: { error: 'Invalid code' } }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import { createUserWithEmailAndPassword } from '../../firebase';
import { verifyOTP } from '../../api/api';

describe('Property 15: OTP flow gates account creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOTP.mockResolvedValue({ success: false, data: { error: 'Invalid code' } });
  });

  it('never calls createUserWithEmailAndPassword when OTP verification fails', async () => {
    // Property: for any OTP code, if verifyOTP returns { success: false },
    // createUserWithEmailAndPassword must never be called.
    // We test this with multiple OTP code values using fast-check.
    const otpCodes = fc.sample(fc.string({ minLength: 1, maxLength: 5 }), 10);

    for (const otpCode of otpCodes) {
      vi.clearAllMocks();
      verifyOTP.mockResolvedValue({ success: false, data: { error: 'Invalid code' } });

      const { unmount } = render(
        <MemoryRouter>
          <UserAuth />
        </MemoryRouter>
      );

      // Navigate to signup
      fireEvent.click(screen.getByText(/signup/i, { selector: 'a' }));

      // Fill signup form with valid password
      fireEvent.change(screen.getByPlaceholderText(/enter your name/i), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
        target: { value: 'StrongPass1!' },
      });

      // Submit signup to trigger OTP send
      fireEvent.submit(screen.getByRole('button', { name: /signup/i }));

      // Wait for OTP view
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter 5-digit code/i)).toBeInTheDocument();
      });

      // Enter OTP code and submit
      fireEvent.change(screen.getByPlaceholderText(/enter 5-digit code/i), {
        target: { value: otpCode },
      });
      fireEvent.submit(screen.getByRole('button', { name: /verify/i }));

      // Wait for OTP verification to complete
      await waitFor(() => {
        expect(verifyOTP).toHaveBeenCalled();
      });

      // createUserWithEmailAndPassword must NOT have been called
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();

      unmount();
    }
  }, 30000);
});
