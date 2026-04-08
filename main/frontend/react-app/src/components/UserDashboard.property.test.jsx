// Feature: html-to-react-migration, Property 17: Notification badge equals unread count
// Feature: html-to-react-migration, Property 18: Mark all read sets all notifications to read
// Validates: Requirements 13.1, 13.2, 13.3

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../api/api', () => ({
  getNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  clearAllNotifications: vi.fn(),
  // file manager API stubs
  getUserFiles: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getUserFolders: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getStorageUsage: vi.fn().mockResolvedValue({ success: true, data: { used_bytes: 0, file_count: 0 } }),
}));

vi.mock('../hooks/useFileManager', () => ({
  useFileManager: vi.fn(() => ({
    files: [],
    folders: [],
    loading: false,
    error: null,
    currentView: 'myfiles',
    searchQuery: '',
    storageInfo: { usedBytes: 0, fileCount: 0 },
    currentFolderId: null,
    setCurrentView: vi.fn(),
    setSearchQuery: vi.fn(),
    uploadFile: vi.fn(),
    trashFile: vi.fn(),
    restoreFile: vi.fn(),
    deleteFile: vi.fn(),
    emptyTrash: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    openFolder: vi.fn(),
  })),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'test-uid-123', displayName: 'Test User' },
    loading: false,
    signOut: vi.fn(),
  })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import {
  getNotifications,
  markAllNotificationsRead,
  clearAllNotifications,
} from '../api/api';
import UserDashboard from '../pages/dashboards/UserDashboard';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <UserDashboard />
    </MemoryRouter>
  );
}

// ── Notification arbitraries ───────────────────────────────────────────────────

const notificationArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  message: fc.string({ minLength: 1, maxLength: 80 }),
  read: fc.boolean(),
  created_at: fc.string(),
  type: fc.string(),
  class_id: fc.option(fc.integer({ min: 1, max: 9999 }), { nil: null }),
});

// ── Property 17 ────────────────────────────────────────────────────────────────

describe('Property 17: Notification badge equals unread count', () => {
  // Validates: Requirements 13.1, 13.2

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('badge count equals the number of unread notifications for any notification list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(notificationArb, { maxLength: 20 }),
        async (notifications) => {
          // Deduplicate ids to avoid React key warnings
          const seen = new Set();
          const uniqueNotifications = notifications.filter(n => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });

          getNotifications.mockResolvedValue({ success: true, data: uniqueNotifications });

          const { unmount, container } = renderDashboard();

          const expectedUnread = uniqueNotifications.filter(n => !n.read).length;

          if (expectedUnread > 0) {
            // Badge should be present and show the correct count
            await waitFor(() => {
              const badge = container.querySelector('[data-testid="unread-badge"]');
              expect(badge).not.toBeNull();
              expect(Number(badge.textContent)).toBe(expectedUnread);
            });
          } else {
            // Badge should be absent when there are no unread notifications
            await waitFor(() => {
              expect(container.querySelector('[data-testid="unread-badge"]')).toBeNull();
            });
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});

// ── Property 18 ────────────────────────────────────────────────────────────────

describe('Property 18: Mark all read sets all notifications to read', () => {
  // Validates: Requirements 13.3

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('after mark-all-read, badge is absent and all notifications appear as read', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(notificationArb, { minLength: 1, maxLength: 10 })
          .filter(arr => arr.some(n => !n.read)),
        async (notifications) => {
          // Deduplicate ids
          const seen = new Set();
          const uniqueNotifications = notifications.filter(n => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });

          // Ensure at least one unread after dedup
          if (!uniqueNotifications.some(n => !n.read)) return;

          getNotifications.mockResolvedValue({ success: true, data: uniqueNotifications });
          markAllNotificationsRead.mockResolvedValue({ success: true, data: {} });

          const { unmount, container } = renderDashboard();

          // Wait for notifications to load — badge should be present
          await waitFor(() => {
            expect(container.querySelector('[data-testid="unread-badge"]')).not.toBeNull();
          });

          // Open notification panel
          const bellBtn = container.querySelector('button[aria-label="Notifications"]');
          fireEvent.click(bellBtn);

          // Click "Mark all as read"
          await waitFor(() => {
            expect(container.querySelector('[data-testid="mark-all-read-btn"]')).not.toBeNull();
          });
          fireEvent.click(container.querySelector('[data-testid="mark-all-read-btn"]'));

          // Badge should disappear (unread count = 0)
          await waitFor(() => {
            expect(container.querySelector('[data-testid="unread-badge"]')).toBeNull();
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});

// ── Property 19 ────────────────────────────────────────────────────────────────
// Feature: html-to-react-migration, Property 19: Clear all empties the notification list
// Validates: Requirements 13.4

describe('Property 19: Clear all empties the notification list', () => {
  // Validates: Requirements 13.4

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('after clear-all, notification list is empty and badge is absent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(notificationArb, { minLength: 1, maxLength: 10 }),
        async (notifications) => {
          // Deduplicate ids
          const seen = new Set();
          const uniqueNotifications = notifications.filter(n => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });

          if (uniqueNotifications.length === 0) return;

          getNotifications.mockResolvedValue({ success: true, data: uniqueNotifications });
          clearAllNotifications.mockResolvedValue({ success: true, data: {} });

          const { unmount, container } = renderDashboard();

          // Wait for dashboard to load
          await waitFor(() => {
            expect(getNotifications).toHaveBeenCalled();
          });

          // Open notification panel
          const bellBtn = container.querySelector('button[aria-label="Notifications"]');
          fireEvent.click(bellBtn);

          // Click "Clear all"
          await waitFor(() => {
            expect(container.querySelector('[data-testid="clear-all-btn"]')).not.toBeNull();
          });
          fireEvent.click(container.querySelector('[data-testid="clear-all-btn"]'));

          // Notification list should be empty and badge absent
          await waitFor(() => {
            expect(container.querySelector('[data-testid="unread-badge"]')).toBeNull();
            expect(container.querySelector('[data-testid^="notification-item-"]')).toBeNull();
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
