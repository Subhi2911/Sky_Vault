// Feature: html-to-react-migration, Property 20: Org code lookup displays organisation name
// Validates: Requirements 6.2

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';

// Mock the API module
vi.mock('../../api/api', () => ({
  getOrgByCode: vi.fn(),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { getOrgByCode } from '../../api/api';
import OrganizationId from './OrganizationId';

function renderComponent() {
  return render(
    <MemoryRouter>
      <OrganizationId />
    </MemoryRouter>
  );
}

describe('Property 20: Org code lookup displays organisation name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the resolved organisation name in the confirmation step for any valid org code', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/\s/g, 'X')),
        fc.string({ minLength: 1, maxLength: 50 }).map(s => s.replace(/\s/g, ' ').trim() || 'OrgName'),
        async (orgCode, orgName) => {
          getOrgByCode.mockResolvedValue({
            success: true,
            data: { name: orgName, code: orgCode, id: 'some-id' },
          });

          const { unmount } = renderComponent();

          const input = screen.getByTestId('org-code-input');
          fireEvent.change(input, { target: { value: orgCode } });

          const submitBtn = screen.getByTestId('submit-button');
          fireEvent.click(submitBtn);

          await waitFor(() => {
            expect(screen.getByTestId('confirm-step')).toBeInTheDocument();
          });

          const orgNameDisplay = screen.getByTestId('org-name-display');
          expect(orgNameDisplay).toBeInTheDocument();
          expect(orgNameDisplay.textContent).toBe(orgName);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
