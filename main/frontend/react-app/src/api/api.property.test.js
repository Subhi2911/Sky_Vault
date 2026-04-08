// Feature: html-to-react-migration, Property 16: API client never throws on network error
// Validates: Requirements 14.3
//
// For any API client function call that encounters a network-level error (fetch rejection),
// the function should return { success: false, error: string } rather than throwing.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  registerUserInBackend,
  sendOTP,
  verifyOTP,
  getUserProfile,
  updateUserProfile,
  uploadFile,
  getUserFiles,
  deleteFile,
  trashFile,
  restoreFile,
  emptyTrashAPI,
  searchFiles,
  getStorageUsage,
  createFolder,
  getUserFolders,
  getFolderFiles,
  deleteFolder,
  getOrgByCode,
  getOrgInfo,
  getOrgStats,
  getOrgMembers,
  removeOrgMember,
  changeOrgMemberRole,
  getOrgClasses,
  createClass,
  getTeacherClasses,
  getStudentClasses,
  deleteClass,
  getStudentByUID,
  lookupStudent,
  getClassStudents,
  addStudentToClass,
  removeStudentFromClass,
  getClassAssignments,
  createAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  submitAssignment,
  toggleSubmissionChecked,
  giveMarks,
  getClassNotes,
  uploadClassNote,
  deleteClassNote,
  getNotifications,
  markAllNotificationsRead,
  clearAllNotifications,
  acceptClassInvite,
  rejectClassInvite,
} from './api.js';

// Minimal File stub for functions that accept a File argument
function makeFile(name = 'test.txt') {
  return new File(['content'], name, { type: 'text/plain' });
}

// Each entry: [label, () => Promise<result>]
// Arguments are minimal valid stubs — the property only cares about network failure behaviour.
const API_FUNCTIONS = [
  ['registerUserInBackend', () => registerUserInBackend('uid', 'a@b.com', 'Name', 'user')],
  ['sendOTP', () => sendOTP('a@b.com')],
  ['verifyOTP', () => verifyOTP('a@b.com', '123456')],
  ['getUserProfile', () => getUserProfile('uid')],
  ['updateUserProfile', () => updateUserProfile('uid', { name: 'X' })],
  ['uploadFile', () => uploadFile(makeFile(), 'uid')],
  ['getUserFiles', () => getUserFiles('uid')],
  ['deleteFile', () => deleteFile(1)],
  ['trashFile', () => trashFile(1)],
  ['restoreFile', () => restoreFile(1)],
  ['emptyTrashAPI', () => emptyTrashAPI('uid')],
  ['searchFiles', () => searchFiles('uid', 'query')],
  ['getStorageUsage', () => getStorageUsage('uid')],
  ['createFolder', () => createFolder('uid', 'folder')],
  ['getUserFolders', () => getUserFolders('uid')],
  ['getFolderFiles', () => getFolderFiles(1)],
  ['deleteFolder', () => deleteFolder(1)],
  ['getOrgByCode', () => getOrgByCode('CODE')],
  ['getOrgInfo', () => getOrgInfo(1)],
  ['getOrgStats', () => getOrgStats(1)],
  ['getOrgMembers', () => getOrgMembers(1)],
  ['removeOrgMember', () => removeOrgMember('uid')],
  ['changeOrgMemberRole', () => changeOrgMemberRole('uid', 'admin')],
  ['getOrgClasses', () => getOrgClasses(1)],
  ['createClass', () => createClass('uid', 1, 'Math', 'Algebra', 'desc')],
  ['getTeacherClasses', () => getTeacherClasses('uid')],
  ['getStudentClasses', () => getStudentClasses('uid')],
  ['deleteClass', () => deleteClass(1)],
  ['getStudentByUID', () => getStudentByUID('uid')],
  ['lookupStudent', () => lookupStudent('a@b.com')],
  ['getClassStudents', () => getClassStudents(1)],
  ['addStudentToClass', () => addStudentToClass(1, 2)],
  ['removeStudentFromClass', () => removeStudentFromClass(1, 2)],
  ['getClassAssignments', () => getClassAssignments(1)],
  ['createAssignment', () => createAssignment(1, 'HW1', 'desc', 10, '2026-12-01')],
  ['deleteAssignment', () => deleteAssignment(1)],
  ['getAssignmentSubmissions', () => getAssignmentSubmissions(1)],
  ['submitAssignment', () => submitAssignment(1, makeFile(), 'uid')],
  ['toggleSubmissionChecked', () => toggleSubmissionChecked(1, 2)],
  ['giveMarks', () => giveMarks(1, 2, 9)],
  ['getClassNotes', () => getClassNotes(1)],
  ['uploadClassNote', () => uploadClassNote(1, makeFile('note.pdf'), 'uid', 'Note 1')],
  ['deleteClassNote', () => deleteClassNote(1)],
  ['getNotifications', () => getNotifications('uid')],
  ['markAllNotificationsRead', () => markAllNotificationsRead('uid')],
  ['clearAllNotifications', () => clearAllNotifications('uid')],
  ['acceptClassInvite', () => acceptClassInvite(1, 'uid')],
  ['rejectClassInvite', () => rejectClassInvite(1, 'uid')],
];

describe('Property 16: API client never throws on network error', () => {
  beforeEach(() => {
    // Replace global fetch with a rejection for every call
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns { success: false, error: string } for every function when fetch rejects', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an arbitrary error message to simulate varied network failures
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          global.fetch.mockRejectedValue(new Error(errorMessage));

          for (const [name, call] of API_FUNCTIONS) {
            let result;
            let threw = false;

            try {
              result = await call();
            } catch {
              threw = true;
            }

            expect(threw, `${name} threw instead of returning { success: false }`).toBe(false);
            expect(result, `${name} returned undefined`).toBeDefined();
            expect(result.success, `${name}.success should be false`).toBe(false);
            expect(typeof result.error, `${name}.error should be a string`).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
