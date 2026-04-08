// Feature: html-to-react-migration
// useFileManager — encapsulates all file/folder state and API calls for a dashboard.
// Requirements: 7.2–7.11

import { useCallback, useEffect, useState } from 'react';
import {
  getUserFiles,
  getAllUserFiles,
  getUserFolders,
  getStorageUsage,
  uploadFile as apiUploadFile,
  trashFile as apiTrashFile,
  restoreFile as apiRestoreFile,
  deleteFile as apiDeleteFile,
  emptyTrashAPI,
  searchFiles,
  createFolder as apiCreateFolder,
  deleteFolder as apiDeleteFolder,
  getFolderFiles,
  toggleStarFile,
} from '../api/api';
import { useDebounce } from './useDebounce';

/**
 * @param {string} uid  Firebase UID of the current user
 * @param {string} [dashboard='user']  Dashboard type passed to file API calls
 */
export function useFileManager(uid, dashboard = 'user') {
  const [files, setFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]); // all files across folders for Recent/Starred/type views
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('myfiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [storageInfo, setStorageInfo] = useState({ usedBytes: 0, fileCount: 0 });
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const refreshStorage = useCallback(async () => {
    if (!uid) return;
    const result = await getStorageUsage(uid);
    if (result.success) {
      setStorageInfo({
        usedBytes: result.data.used_bytes ?? 0,
        fileCount: result.data.file_count ?? 0,
      });
    }
  }, [uid]);

  const fetchFiles = useCallback(async () => {
    if (!uid) return;
    const result = await getUserFiles(uid, dashboard);
    if (result.success) {
      const data = result.data;
      setFiles(Array.isArray(data) ? data : (data?.files ?? []));
    } else {
      // 404 = new user not in DB yet, treat as empty
      if (!result.error?.includes('404') && !result.error?.includes('not found')) {
        setError(result.error ?? 'Failed to load files');
      }
      setFiles([]);
    }
  }, [uid, dashboard]);

  const fetchAllFiles = useCallback(async () => {
    if (!uid) return;
    const result = await getAllUserFiles(uid);
    if (result.success) {
      const data = result.data;
      setAllFiles(Array.isArray(data) ? data : (data?.files ?? []));
    }
  }, [uid]);

  const fetchFolders = useCallback(async () => {
    if (!uid) return;
    const result = await getUserFolders(uid);
    if (result.success) {
      const data = result.data;
      setFolders(Array.isArray(data) ? data : (data?.folders ?? []));
    } else {
      // 404 means user has no folders yet (new user) — not an error
      if (!result.error?.includes('404') && !result.error?.includes('not found')) {
        setError(result.error ?? 'Failed to load folders');
      }
      setFolders([]);
    }
  }, [uid]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    // Only do the full initial load when at root (not inside a folder)
    if (currentFolderId !== null) return;
    setLoading(true);
    Promise.all([fetchFiles(), fetchAllFiles(), fetchFolders(), refreshStorage()]).finally(() =>
      setLoading(false)
    );
  }, [uid, fetchFiles, fetchAllFiles, fetchFolders, refreshStorage]);

  // ── Debounced search ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return;
    if (!debouncedQuery.trim()) {
      // Only refetch root files if we're not inside a folder
      if (currentFolderId === null) fetchFiles();
      return;
    }
    searchFiles(uid, debouncedQuery, dashboard).then((result) => {
      if (result.success) {
        const data = result.data;
        setFiles(Array.isArray(data) ? data : (data?.files ?? []));
      } else {
        setError(result.error ?? 'Search failed');
      }
    });
  }, [debouncedQuery, uid, dashboard, fetchFiles, currentFolderId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file) => {
      const result = await apiUploadFile(file, uid, currentFolderId, dashboard);
      if (result.success) {
        if (currentFolderId !== null) {
          // Re-fetch folder contents to show the newly uploaded file
          const folderResult = await getFolderFiles(currentFolderId);
          if (folderResult.success) {
            const data = folderResult.data;
            setFiles(Array.isArray(data) ? data : (data?.files ?? []));
          }
        } else {
          await fetchFiles();
        }
        await fetchAllFiles();
        await refreshStorage();
      } else {
        setError(result.error ?? 'Upload failed');
      }
      return result;
    },
    [uid, currentFolderId, dashboard, fetchFiles, fetchAllFiles, refreshStorage]
  );

  const trashFile = useCallback(
    async (fileId) => {
      const result = await apiTrashFile(fileId);
      if (result.success) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, trashed: true } : f)));
        setAllFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, trashed: true } : f)));
      } else {
        setError(result.error ?? 'Failed to trash file');
      }
      return result;
    },
    []
  );

  const restoreFile = useCallback(async (fileId) => {
    const result = await apiRestoreFile(fileId);
    if (result.success) {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, trashed: false } : f)));
      setAllFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, trashed: false } : f)));
    } else {
      setError(result.error ?? 'Failed to restore file');
    }
    return result;
  }, []);

  const deleteFile = useCallback(
    async (fileId) => {
      const result = await apiDeleteFile(fileId);
      if (result.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setAllFiles((prev) => prev.filter((f) => f.id !== fileId));
        await refreshStorage();
      } else {
        setError(result.error ?? 'Failed to delete file');
      }
      return result;
    },
    [refreshStorage]
  );

  const emptyTrash = useCallback(
    async () => {
      const result = await emptyTrashAPI(uid);
      if (result.success) {
        setFiles((prev) => prev.filter((f) => !f.trashed));
        await refreshStorage();
      } else {
        setError(result.error ?? 'Failed to empty trash');
      }
      return result;
    },
    [uid, refreshStorage]
  );

  const starFile = useCallback(async (fileId) => {
    const result = await toggleStarFile(fileId);
    if (result.success) {
      const starred = result.data?.starred;
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, starred } : f));
      setAllFiles(prev => prev.map(f => f.id === fileId ? { ...f, starred } : f));
    } else {
      setError(result.error ?? 'Failed to star file');
    }
    return result;
  }, []);

  const createFolder = useCallback(
    async (name) => {
      const result = await apiCreateFolder(uid, name);
      if (result.success) {
        // backend returns { folder_id, name, message } — normalise to folder shape
        const folder = result.data?.folder_id
          ? { id: result.data.folder_id, name: result.data.name, file_count: 0, created_at: new Date().toISOString() }
          : result.data;
        setFolders((prev) => [folder, ...prev]);
      } else {
        setError(result.error ?? 'Failed to create folder');
      }
      return result;
    },
    [uid]
  );

  const deleteFolder = useCallback(async (folderId) => {
    const result = await apiDeleteFolder(folderId);
    if (result.success) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      // files inside the folder are now trashed by the backend — refresh allFiles to reflect this
      await fetchAllFiles();
    } else {
      setError(result.error ?? 'Failed to delete folder');
    }
    return result;
  }, [fetchAllFiles]);

  const openFolder = useCallback(
    async (folderId) => {
      setCurrentFolderId(folderId);
      if (folderId === null) {
        await fetchFiles();
        return;
      }
      const result = await getFolderFiles(folderId);
      if (result.success) {
        const data = result.data;
        setFiles(Array.isArray(data) ? data : (data?.files ?? []));
      } else {
        setError(result.error ?? 'Failed to open folder');
      }
    },
    [fetchFiles]
  );

  return {
    // State
    files,
    allFiles,
    folders,
    loading,
    error,
    currentView,
    searchQuery,
    storageInfo,
    currentFolderId,
    // Actions
    setCurrentView,
    setSearchQuery,
    uploadFile,
    trashFile,
    restoreFile,
    deleteFile,
    emptyTrash,
    starFile,
    createFolder,
    deleteFolder,
    openFolder,
  };
}
