// Feature: html-to-react-migration
// API Client — all functions ported from main/frontend/api.js as named ES module exports.
// Base URL reads from the Vite env variable with a fallback of '/api' so the
// Vite dev-server proxy handles routing in development.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ── Auth / User ───────────────────────────────────────────────────────────────

export async function registerUserInBackend(firebaseUid, email, name, role, orgCode = '', orgName = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firebase_uid: firebaseUid,
                email, name, role,
                org_code: orgCode,
                org_name: orgName,
            }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function sendOTP(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function verifyOTP(email, code) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function updateUserProfile(firebaseUid, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${firebaseUid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Files ─────────────────────────────────────────────────────────────────────

export async function uploadFile(file, firebaseUid, folderId = null, dashboard = 'user') {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('firebase_uid', firebaseUid);
        formData.append('dashboard', dashboard);
        if (folderId) formData.append('folder_id', folderId);
        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getUserFiles(firebaseUid, dashboard = 'user') {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${firebaseUid}?dashboard=${dashboard}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getAllUserFiles(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/all/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function toggleStarFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}/star`, { method: 'PUT' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function trashFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}/trash`, { method: 'PUT' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function restoreFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}/restore`, { method: 'PUT' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function emptyTrashAPI(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${firebaseUid}/empty-trash`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function searchFiles(firebaseUid, query, dashboard = 'user') {
    try {
        const response = await fetch(
            `${API_BASE_URL}/files/search/${firebaseUid}?q=${encodeURIComponent(query)}&dashboard=${dashboard}`
        );
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getStorageUsage(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/storage/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function createFolder(firebaseUid, name) {
    try {
        const response = await fetch(`${API_BASE_URL}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebase_uid: firebaseUid, name }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getUserFolders(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getFolderFiles(folderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}/files`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteFolder(folderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Organisation ──────────────────────────────────────────────────────────────

export async function getOrgByCode(code) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/by-code/${code}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getOrgInfo(orgId) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/${orgId}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getOrgStats(orgId) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/${orgId}/stats`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getOrgMembers(orgId) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/${orgId}/members`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function removeOrgMember(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/members/${userId}`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function changeOrgMemberRole(userId, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/members/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getOrgClasses(orgId) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/${orgId}/classes`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Classes ───────────────────────────────────────────────────────────────────

export async function createClass(firebaseUid, orgId, name, subject, description) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebase_uid: firebaseUid, org_id: orgId, name, subject, description }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getTeacherClasses(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/teacher/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getStudentClasses(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/student/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteClass(classId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Class Students ────────────────────────────────────────────────────────────

export async function getStudentByUID(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/student/by-uid/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function lookupStudent(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/student/lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getClassStudents(classId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/students`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function addStudentToClass(classId, studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function removeStudentFromClass(classId, studentDbId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/students/${studentDbId}`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function getClassAssignments(classId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/assignments`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function createAssignment(classId, title, description, marks, dueDate) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, marks, due_date: dueDate }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteAssignment(assignmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getAssignmentSubmissions(assignmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submissions`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function submitAssignment(assignmentId, file, firebaseUid) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('firebase_uid', firebaseUid);
        const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submit`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function toggleSubmissionChecked(assignmentId, studentDbId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/assignments/${assignmentId}/submissions/${studentDbId}/check`,
            { method: 'PUT' }
        );
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function giveMarks(assignmentId, studentDbId, marks) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/assignments/${assignmentId}/submissions/${studentDbId}/marks`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marks }),
            }
        );
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Class Notes ───────────────────────────────────────────────────────────────

export async function getClassNotes(classId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/notes`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function uploadClassNote(classId, file, firebaseUid, title) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('firebase_uid', firebaseUid);
        formData.append('title', title || file.name);
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/notes`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteClassNote(noteId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/notes/${noteId}`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${firebaseUid}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function markNotificationRead(notifId) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notifId}/read`, { method: 'PUT' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function markAllNotificationsRead(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${firebaseUid}/read-all`, { method: 'PUT' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function clearAllNotifications(firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${firebaseUid}/clear-all`, { method: 'DELETE' });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Class Invites ─────────────────────────────────────────────────────────────

export async function acceptClassInvite(classId, firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/invite/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebase_uid: firebaseUid }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function rejectClassInvite(classId, firebaseUid) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/invite/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebase_uid: firebaseUid }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Superadmin ────────────────────────────────────────────────────────────────

export async function getAllOrgs(platformSecret) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/all`, {
            headers: { 'X-Platform-Secret': platformSecret },
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function createOrg(name, contactEmail, platformSecret) {
    try {
        const response = await fetch(`${API_BASE_URL}/org/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Platform-Secret': platformSecret },
            body: JSON.stringify({ name, contact_email: contactEmail }),
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
