// Feature: html-to-react-migration — Requirements: 7.1–7.13, 13.1–13.4
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFileManager } from '../../hooks/useFileManager';
import FilePreviewModal from '../../components/FilePreviewModal';
import Spinner from '../../components/Spinner';
import { getNotifications, markAllNotificationsRead, clearAllNotifications } from '../../api/api';

const STORAGE_TOTAL = 20 * 1024 * 1024 * 1024;
const FILE_TYPE_EXTS = {
  images:    ['jpg','jpeg','png','gif','webp','svg','bmp','ico','tiff','tif'],
  documents: ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','md','rtf','odt','ods','odp'],
  videos:    ['mp4','avi','mov','mkv','webm','flv','wmv','m4v','3gp'],
  audio:     ['mp3','wav','ogg','aac','flac','m4a','wma','opus'],
};

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (FILE_TYPE_EXTS.images.includes(ext)) return 'fas fa-file-image';
  if (FILE_TYPE_EXTS.videos.includes(ext)) return 'fas fa-file-video';
  if (FILE_TYPE_EXTS.audio.includes(ext)) return 'fas fa-file-audio';
  if (['pdf'].includes(ext)) return 'fas fa-file-pdf';
  if (['doc','docx'].includes(ext)) return 'fas fa-file-word';
  if (['xls','xlsx'].includes(ext)) return 'fas fa-file-excel';
  if (['ppt','pptx'].includes(ext)) return 'fas fa-file-powerpoint';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'fas fa-file-archive';
  return 'fas fa-file';
}

function getFileColor(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (FILE_TYPE_EXTS.images.includes(ext)) return '#10b981';
  if (FILE_TYPE_EXTS.videos.includes(ext)) return '#8b5cf6';
  if (FILE_TYPE_EXTS.audio.includes(ext)) return '#f59e0b';
  if (ext === 'pdf') return '#ef4444';
  if (['doc','docx'].includes(ext)) return '#2563eb';
  if (['xls','xlsx'].includes(ext)) return '#16a34a';
  return '#667eea';
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

function formatDate(dateString) {
  if (!dateString) return '';
  const utcString = dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  const date = new Date(utcString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function filterFiles(files, view) {
  switch (view) {
    case 'myfiles': return files.filter(f => !f.trashed);
    case 'recent':  return files.filter(f => !f.trashed).sort((a,b) => new Date(b.upload_time||0) - new Date(a.upload_time||0));
    case 'starred': return files.filter(f => f.starred && !f.trashed);
    case 'trash':   return files.filter(f => f.trashed);
    case 'images': case 'documents': case 'videos': case 'audio': {
      const exts = FILE_TYPE_EXTS[view];
      return files.filter(f => {
        if (f.trashed) return false;
        const ext = (f.filename || '').split('.').pop().toLowerCase();
        return exts.includes(ext);
      });
    }
    default: return files.filter(f => !f.trashed);
  }
}

// ── StorageWidget ──────────────────────────────────────────────────────────
const CIRC = 2 * Math.PI * 34;
function StorageWidget({ usedBytes, totalBytes }) {
  const pct = totalBytes > 0 ? Math.min((usedBytes / totalBytes) * 100, 100) : 0;
  const offset = totalBytes > 0 ? CIRC * (1 - pct / 100) : CIRC;
  const stroke = pct > 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#667eea';
  return (
    <div style={{ background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, margin: '0 auto 1rem' }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={stroke} strokeWidth="8"
            strokeDasharray={CIRC} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }} />
        </svg>
      </div>
      <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Storage Used</div>
      <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>{formatFileSize(usedBytes)} of 20 GB</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>{pct.toFixed(1)}%</div>
      <button style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
        Upgrade Storage
      </button>
    </div>
  );
}

// ── FileCard ───────────────────────────────────────────────────────────────
function FileCard({ file, onPreview, onTrash, onRestore, onDelete, onStar }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const name = file.filename || file.name || 'Untitled';
  const icon = getFileIcon(name);
  const color = getFileColor(name);
  const info = formatFileSize(file.file_size) + ' · ' + formatDate(file.upload_time || file.date);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="ud-file-card" onClick={() => onPreview(file)}>
      {file.starred && <div className="ud-star-badge"><i className="fas fa-star" /></div>}
      {file.trashed && <div className="ud-trash-badge">Trashed</div>}
      <div ref={ref} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
        <button className={`ud-file-menu${open ? ' active' : ''}`}
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
          <i className="fas fa-ellipsis-v" />
        </button>
        {open && (
          <div className="ud-dropdown">
            <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onPreview(file); setOpen(false); }}>
              <i className="fas fa-eye" /> Preview
            </div>
            {file.public_url && (
              <a className="ud-dropdown-item" href={file.public_url} download onClick={e => e.stopPropagation()}>
                <i className="fas fa-download" /> Download
              </a>
            )}
            <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onStar && onStar(file); setOpen(false); }}>
              <i className={file.starred ? 'fas fa-star' : 'far fa-star'} /> {file.starred ? 'Unstar' : 'Star'}
            </div>
            <div className="ud-dropdown-divider" />
            {file.trashed ? (
              <>
                <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onRestore(file); setOpen(false); }}>
                  <i className="fas fa-trash-restore" /> Restore
                </div>
                <div className="ud-dropdown-item danger" onClick={e => { e.stopPropagation(); onDelete(file); setOpen(false); }}>
                  <i className="fas fa-trash-alt" /> Delete Permanently
                </div>
              </>
            ) : (
              <div className="ud-dropdown-item danger" onClick={e => { e.stopPropagation(); onTrash(file); setOpen(false); }}>
                <i className="fas fa-trash" /> Move to Trash
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ud-file-icon"><i className={icon} style={{ color }} /></div>
      <div className="ud-file-name">{name}</div>
      <div className="ud-file-info">{info}</div>
    </div>
  );
}

// ── FolderCard ─────────────────────────────────────────────────────────────
function FolderCard({ folder, onClick, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="ud-file-card" onClick={onClick}>
      <div ref={ref} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
        <button className={`ud-file-menu${open ? ' active' : ''}`}
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
          <i className="fas fa-ellipsis-v" />
        </button>
        {open && (
          <div className="ud-dropdown">
            <div className="ud-dropdown-item danger" onClick={e => { e.stopPropagation(); onDelete(folder); setOpen(false); }}>
              <i className="fas fa-trash" /> Delete Folder
            </div>
          </div>
        )}
      </div>
      <div className="ud-file-icon"><i className="fas fa-folder" style={{ color: '#f59e0b' }} /></div>
      <div className="ud-file-name">{folder.name}</div>
      <div className="ud-file-info">{folder.file_count ?? 0} files</div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'myfiles',   label: 'My Files',   icon: 'fas fa-home' },
  { id: 'recent',    label: 'Recent',     icon: 'fas fa-clock' },
  { id: 'starred',   label: 'Starred',    icon: 'fas fa-star' },
  { id: 'trash',     label: 'Trash',      icon: 'fas fa-trash' },
];
const TYPE_ITEMS = [
  { id: 'images',    label: 'Images',     icon: 'fas fa-file-image' },
  { id: 'documents', label: 'Documents',  icon: 'fas fa-file-alt' },
  { id: 'videos',    label: 'Videos',     icon: 'fas fa-file-video' },
  { id: 'audio',     label: 'Audio',      icon: 'fas fa-file-audio' },
];

function Sidebar({ activeView, onViewChange, storageUsed, storageTotal }) {
  return (
    <aside className="ud-sidebar">
      <div className="ud-sidebar-section">
        <div className="ud-sidebar-title">Navigation</div>
        {NAV_ITEMS.map(item => (
          <div key={item.id} className={`ud-sidebar-item${activeView === item.id ? ' active' : ''}`}
            onClick={() => onViewChange(item.id)}>
            <i className={item.icon} style={{ width: 20, textAlign: 'center' }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="ud-sidebar-section">
        <div className="ud-sidebar-title">File Types</div>
        {TYPE_ITEMS.map(item => (
          <div key={item.id} className={`ud-sidebar-item${activeView === item.id ? ' active' : ''}`}
            onClick={() => onViewChange(item.id)}>
            <i className={item.icon} style={{ width: 20, textAlign: 'center' }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <StorageWidget usedBytes={storageUsed} totalBytes={storageTotal} />
    </aside>
  );
}

// ── Notification Panel ─────────────────────────────────────────────────────
function NotifPanel({ notifications, onMarkAll, onClearAll }) {
  return (
    <div className="ud-notif-panel" data-testid="notification-panel">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <h3 style={{ margin:0, fontSize:'1.1rem', fontWeight:700 }}>Notifications</h3>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button data-testid="mark-all-read-btn" onClick={onMarkAll}
            style={{ background:'none', border:'none', color:'#667eea', cursor:'pointer', fontSize:'0.875rem', fontWeight:600 }}>
            Mark all as read
          </button>
          <button data-testid="clear-all-btn" onClick={onClearAll}
            style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.875rem', fontWeight:600 }}>
            Clear all
          </button>
        </div>
      </div>
      {notifications.length === 0
        ? <p style={{ color:'#64748b', textAlign:'center', padding:'1rem 0' }}>No notifications</p>
        : <div style={{ maxHeight:320, overflowY:'auto' }}>
            {notifications.map(n => (
              <div key={n.id} data-testid={`notification-item-${n.id}`}
                style={{ padding:'0.75rem', borderRadius:8, marginBottom:'0.5rem',
                  background: n.read ? '#f8fafc' : '#eff6ff',
                  borderLeft: n.read ? '3px solid #e2e8f0' : '3px solid #667eea' }}>
                <p style={{ margin:0, fontSize:'0.875rem', color:'#334155' }}>{n.message}</p>
                <span style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{n.created_at}</span>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function UserDashboard() {  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const uid = user?.uid;

  const { files, allFiles, folders, loading, error, currentView, searchQuery, storageInfo,
    setCurrentView, setSearchQuery, uploadFile, trashFile, restoreFile, deleteFile,
    emptyTrash, starFile, createFolder, deleteFolder, openFolder } = useFileManager(uid, 'user');

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [folderName, setFolderName] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    getNotifications(uid).then(res => {
      if (res.success) {
        const raw = res.data?.notifications ?? res.data ?? [];
        setNotifications((Array.isArray(raw) ? raw : []).map(n => ({
          ...n, read: n.read ?? n.is_read ?? false,
          message: n.message ?? n.body ?? n.title ?? ''
        })));
      }
    });
  }, [uid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function handleMarkAllRead() {
    const res = await markAllNotificationsRead(uid);
    if (res.success) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }
  async function handleClearAll() {
    const res = await clearAllNotifications(uid);
    if (res.success) setNotifications([]);
  }
  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  }
  async function handleCreateFolder() {
    const name = window.prompt('Enter folder name:');
    if (name?.trim()) await createFolder(name.trim());
  }
  async function handleLogout() {
    await signOut();
    localStorage.clear();
    window.location.href = '/';
  }

  const VIEW_TITLES = { myfiles:'My Files', recent:'Recent', starred:'Starred', trash:'Trash',
    images:'Images', documents:'Documents', videos:'Videos', audio:'Audio' };

  const filtered = filterFiles(
    ['recent', 'starred', 'images', 'documents', 'videos', 'audio'].includes(currentView) ? allFiles : files,
    currentView
  );
  const showFolders = currentView === 'myfiles' && !folderName;

  if (loading) return <Spinner />;

  return (
    <>
      <div className="ud-root">
        {/* Header */}
        <header className="ud-header">
          <div className="ud-nav-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Mobile sidebar toggle */}
              <button className="ud-sidebar-drawer-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
                <i className="fas fa-bars" />
              </button>
              <div className="ud-logo"><i className="fas fa-cloud" /> Sky Vault</div>
            </div>
            <div className="ud-nav-actions">
              <div className="ud-search-box">
                <i className="fas fa-search" />
                <input type="text" placeholder="Search files and folders..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="ud-user-menu">
                <button className="ud-icon-btn" onClick={() => setNotifOpen(v => !v)} aria-label="Notifications">
                  <i className="fas fa-bell" />
                  {unreadCount > 0 && <span data-testid="unread-badge" className="ud-badge">{unreadCount}</span>}
                </button>
                <button className="ud-icon-btn" onClick={() => navigate('/user-profile')} aria-label="Profile">
                  <i className="fas fa-user" />
                </button>
                <button className="ud-logout-btn" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt" /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {notifOpen && <NotifPanel notifications={notifications} onMarkAll={handleMarkAllRead} onClearAll={handleClearAll} />}

        {/* Mobile sidebar drawer */}
        <div className={`ud-sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <div className={`ud-sidebar-drawer${sidebarOpen ? ' open' : ''}`}>
          <button className="ud-sidebar-drawer-close" onClick={() => setSidebarOpen(false)}>
            <i className="fas fa-times" />
          </button>
          {/* Inline sidebar content for mobile — not affected by ud-sidebar display:none */}
          <div style={{ marginTop: '2.5rem' }}>
            <div className="ud-sidebar-section">
              <div className="ud-sidebar-title">Navigation</div>
              {[
                { id: 'myfiles', label: 'My Files', icon: 'fas fa-home' },
                { id: 'recent', label: 'Recent', icon: 'fas fa-clock' },
                { id: 'starred', label: 'Starred', icon: 'fas fa-star' },
                { id: 'trash', label: 'Trash', icon: 'fas fa-trash' },
              ].map(item => (
                <div key={item.id}
                  className={`ud-sidebar-item${currentView === item.id ? ' active' : ''}`}
                  onClick={() => { setCurrentView(item.id); setFolderName(null); openFolder(null); setSidebarOpen(false); }}>
                  <i className={item.icon} style={{ width: 20, textAlign: 'center' }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="ud-sidebar-section">
              <div className="ud-sidebar-title">File Types</div>
              {[
                { id: 'images', label: 'Images', icon: 'fas fa-file-image' },
                { id: 'documents', label: 'Documents', icon: 'fas fa-file-alt' },
                { id: 'videos', label: 'Videos', icon: 'fas fa-file-video' },
                { id: 'audio', label: 'Audio', icon: 'fas fa-file-audio' },
              ].map(item => (
                <div key={item.id}
                  className={`ud-sidebar-item${currentView === item.id ? ' active' : ''}`}
                  onClick={() => { setCurrentView(item.id); setFolderName(null); openFolder(null); setSidebarOpen(false); }}>
                  <i className={item.icon} style={{ width: 20, textAlign: 'center' }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <StorageWidget usedBytes={storageInfo.usedBytes} totalBytes={STORAGE_TOTAL} />
          </div>
        </div>

        <div className="ud-main-container">
          <Sidebar activeView={currentView} onViewChange={v => { setCurrentView(v); setFolderName(null); openFolder(null); }}
            storageUsed={storageInfo.usedBytes} storageTotal={STORAGE_TOTAL} />

          <main className="ud-content-area">
            <div className="ud-content-header">
              <h2>
                {folderName ? (
                  <span>
                    <button onClick={() => { openFolder(null); setFolderName(null); }}
                      style={{ background:'none', border:'none', color:'#667eea', cursor:'pointer', fontWeight:700, fontSize:'1rem', marginRight:'0.5rem', padding:0 }}>
                      <i className="fas fa-arrow-left" /> My Files
                    </button>
                    <span style={{ color:'#94a3b8', margin:'0 0.5rem' }}>/</span>
                    {folderName}
                  </span>
                ) : (VIEW_TITLES[currentView] || 'My Files')}
              </h2>
              {error && <div className="ud-error">{error}</div>}
              <div className="ud-action-buttons">
                {currentView !== 'trash' && (
                  <>
                    <button className="ud-btn-primary" onClick={() => fileInputRef.current?.click()}>
                      <i className="fas fa-upload" /> Upload Files
                    </button>
                    <input ref={fileInputRef} type="file" style={{ display:'none' }} onChange={handleUpload} />
                    {!folderName && (
                      <button className="ud-btn-secondary" onClick={handleCreateFolder}>
                        <i className="fas fa-folder-plus" /> New Folder
                      </button>
                    )}
                  </>
                )}
                {currentView === 'trash' && (
                  <button data-testid="empty-trash-btn" className="ud-btn-danger" onClick={() => emptyTrash()}>
                    <i className="fas fa-trash-alt" /> Empty Trash
                  </button>
                )}
              </div>
            </div>

            <div className="ud-file-grid">
              {showFolders && folders.map(folder => (
                <FolderCard key={`folder-${folder.id}`} folder={folder}
                  onClick={() => { openFolder(folder.id); setFolderName(folder.name); }}
                  onDelete={f => deleteFolder(f.id)} />
              ))}
              {filtered.map(file => (
                <FileCard key={file.id} file={file}
                  onPreview={setPreviewFile}
                  onTrash={f => trashFile(f.id)}
                  onRestore={f => restoreFile(f.id)}
                  onDelete={f => deleteFile(f.id)}
                  onStar={f => starFile(f.id)} />
              ))}
              {filtered.length === 0 && (!showFolders || folders.length === 0) && (
                <div className="ud-empty-state">
                  <i className="fas fa-folder-open" />
                  <h3>No files here</h3>
                  <p>Upload files or create a folder to get started.</p>
                </div>
              )}
            </div>
          </main>
        </div>

        {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      </div>
    </>
  );
}

const UD_CSS = `
.ud-root{font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#334155;min-height:100vh;width:100%;overflow-x:hidden}
.ud-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:1rem 0;box-shadow:0 4px 20px rgba(102,126,234,0.15);position:sticky;top:0;z-index:100}
.ud-nav-container{max-width:1400px;margin:0 auto;padding:0 2rem;display:flex;justify-content:space-between;align-items:center}
.ud-logo{display:flex;align-items:center;gap:0.75rem;font-size:1.5rem;font-weight:800}
.ud-logo i{font-size:1.75rem}
.ud-nav-actions{display:flex;align-items:center;gap:1.5rem}
.ud-search-box{position:relative}
.ud-search-box i{position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.7)}
.ud-search-box input{background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.2);border-radius:25px;padding:0.5rem 1rem 0.5rem 2.5rem;color:white;width:300px;outline:none;font-size:0.9rem}
.ud-search-box input::placeholder{color:rgba(255,255,255,0.7)}
.ud-search-box input:focus{background:rgba(255,255,255,0.25);border-color:rgba(255,255,255,0.4)}
.ud-user-menu{display:flex;align-items:center;gap:1rem}
.ud-icon-btn{background:rgba(255,255,255,0.15);border:none;color:white;padding:0.75rem;border-radius:50%;cursor:pointer;position:relative;transition:all 0.3s}
.ud-icon-btn:hover{background:rgba(255,255,255,0.25);transform:translateY(-2px)}
.ud-badge{position:absolute;top:2px;right:2px;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;font-size:0.7rem;display:flex;align-items:center;justify-content:center;font-weight:700}
.ud-logout-btn{background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:white;padding:0.5rem 1.25rem;border-radius:25px;cursor:pointer;font-weight:600;transition:all 0.3s;display:flex;align-items:center;gap:0.5rem}
.ud-logout-btn:hover{background:white;color:#667eea;transform:translateY(-2px)}
.ud-main-container{max-width:1400px;margin:0 auto;padding:2rem;display:grid;grid-template-columns:280px 1fr;gap:2rem}
.ud-sidebar{background:white;border-radius:16px;padding:1.5rem;box-shadow:0 4px 20px rgba(0,0,0,0.08);height:fit-content;position:sticky;top:90px}
.ud-sidebar-section{margin-bottom:2rem}
.ud-sidebar-title{font-size:0.875rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem}
.ud-sidebar-item{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;border-radius:12px;cursor:pointer;transition:all 0.3s;margin-bottom:0.5rem;font-weight:500;color:#334155}
.ud-sidebar-item:hover{background:#f1f5f9;color:#667eea}
.ud-sidebar-item.active{background:linear-gradient(135deg,#667eea,#764ba2);color:white}
.ud-content-area{background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);min-height:600px}
.ud-content-header{padding:2rem 2rem 1rem;border-bottom:1px solid #e2e8f0}
.ud-content-header h2{font-size:1.75rem;font-weight:700;color:#1e293b;margin-bottom:1rem}
.ud-error{color:#dc2626;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:0.75rem 1rem;font-size:0.875rem;margin-bottom:1rem}
.ud-action-buttons{display:flex;gap:1rem;flex-wrap:wrap}
.ud-btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;padding:0.75rem 1.5rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;transition:all 0.3s}
.ud-btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.4)}
.ud-btn-secondary{background:#f8fafc;color:#64748b;border:2px solid #e2e8f0;padding:0.75rem 1.5rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;transition:all 0.3s}
.ud-btn-secondary:hover{background:#f1f5f9;border-color:#cbd5e1;transform:translateY(-2px)}
.ud-btn-danger{background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:0.75rem 1.5rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem}
.ud-file-grid{padding:2rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1.5rem}
.ud-file-card{background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:1.5rem;text-align:center;cursor:pointer;transition:all 0.3s;position:relative;overflow:visible}
.ud-file-card:hover{border-color:#667eea;box-shadow:0 8px 25px rgba(102,126,234,0.15)}
.ud-file-icon{font-size:3rem;margin-bottom:1rem}
.ud-file-name{font-weight:600;color:#1e293b;margin-bottom:0.5rem;word-break:break-word;font-size:0.9rem}
.ud-file-info{font-size:0.8rem;color:#64748b}
.ud-file-menu{position:absolute;top:0.75rem;right:0.75rem;background:white;border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:all 0.3s;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:10;color:#64748b}
.ud-file-card:hover .ud-file-menu,.ud-file-menu.active{opacity:1}
.ud-dropdown{position:absolute;top:36px;right:0;background:white;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2);min-width:200px;padding:0.5rem;z-index:9999;animation:udFadeIn 0.2s ease-out}
@keyframes udFadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.ud-dropdown-item{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;border-radius:8px;cursor:pointer;transition:all 0.2s;font-size:0.9rem;color:#334155;text-decoration:none;white-space:nowrap}
.ud-dropdown-item:hover{background:#f1f5f9;color:#667eea}
.ud-dropdown-item.danger:hover{background:#fee2e2;color:#dc2626}
.ud-dropdown-item i{width:20px;text-align:center}
.ud-dropdown-divider{height:1px;background:#e2e8f0;margin:0.5rem 0}
.ud-star-badge{position:absolute;top:0.5rem;left:0.5rem;background:#fbbf24;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.875rem}
.ud-trash-badge{position:absolute;top:0.5rem;left:0.5rem;background:#ef4444;color:white;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.75rem;font-weight:600}
.ud-empty-state{grid-column:1/-1;text-align:center;padding:4rem 2rem;color:#64748b}
.ud-empty-state i{font-size:4rem;margin-bottom:1rem;color:#cbd5e1;display:block}
.ud-empty-state h3{font-size:1.25rem;margin-bottom:0.5rem;color:#475569}
.ud-notif-panel{position:fixed;top:80px;right:24px;width:360px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);z-index:500;padding:1.5rem}
@media(max-width:1024px){.ud-main-container{grid-template-columns:1fr}.ud-sidebar{position:static}}
@media(max-width:768px){.ud-search-box{display:none}.ud-main-container{padding:1rem}}
`;

