// Feature: html-to-react-migration, Property 21: Role selection navigates with org code in route state
// Validates: Requirements 6.5

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import OrganizationRole from './OrganizationRole';

const ROLES = [
  { role: 'user',    path: '/user-auth',    testId: 'role-btn-user' },
  { role: 'student', path: '/student-auth', testId: 'role-btn-student' },
  { role: 'teacher', path: '/teacher-auth', testId: 'role-btn-teacher' },
  { role: 'admin',   path: '/admin-auth',   testId: 'role-btn-admin' },
];

function renderWithState(orgCode, orgName = 'Test Org') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/organization-role', state: { orgCode, orgName } }]}>
      <Routes>
        <Route path="/organization-role" element={<OrganizationRole />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Property 21: Role selection navigates with org code in route state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to the correct auth path with orgCode in state for each role', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/\s/g, 'X') || 'ORG1'),
        fc.constantFrom(...ROLES),
        (orgCode, roleConfig) => {
          const { unmount } = renderWithState(orgCode);

          const btn = screen.getByTestId(roleConfig.testId);
          fireEvent.click(btn);

          expect(mockNavigate).toHaveBeenCalledWith(
            roleConfig.path,
            expect.objectContaining({
              state: expect.objectContaining({ orgCode }),
            })
          );

          unmount();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });
});
