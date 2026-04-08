// Feature: html-to-react-migration
// Requirements: 8.1–8.6

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFileManager } from '../../hooks/useFileManager';
import FilePreviewModal from '../../components/FilePreviewModal';
import Spinner from '../../components/Spinner';
import {
  getStudentClasses, getClassAssignments, getClassNotes,
  submitAssignment, getAssignmentSubmissions,
  acceptClassInvite, rejectClassInvite, getStudentByUID,
  getNotifications, markAllNotificationsRead, clearAllNotifications, markNotificationRead,
} from '../../api/api';

const SG  = 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)';
const NG  = 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)';
const STORAGE_TOTAL = 20 * 1024 * 1024 * 1024;
const CLASS_ICONS   = ['🧮','🔬','💻','📖','⚛️','🌍'];

const FILE_TYPE_EXTS = {
  images:    ['jpg','jpeg','png','gif','webp','svg','bmp'],
  documents: ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','md'],
  videos:    ['mp4','avi','mov','mkv','webm'],
  audio:     ['mp3','wav','ogg','aac','flac'],
};

function formatDate(s) {
  if (!s) return '';
  const utc = s.endsWith('Z') || s.includes('+') ? s : s + 'Z';
  const d = new Date(utc), diff = Math.floor((Date.now() - d) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff/60)} hr ago`;
  return d.toLocaleDateString();
}

function filterFiles(files, view) {
  switch (view) {
    case 'myfiles':   return { showFolders: true,  filtered: files.filter(f => !f.trashed) };
    case 'recent':    return { showFolders: false, filtered: files.filter(f => !f.trashed).sort((a,b) => new Date(b.upload_time||0)-new Date(a.upload_time||0)) };
    case 'starred':   return { showFolders: false, filtered: files.filter(f => f.starred && !f.trashed) };
    case 'trash':     return { showFolders: false, filtered: files.filter(f => f.trashed) };
    case 'images': case 'documents': case 'videos': case 'audio': {
      const exts = FILE_TYPE_EXTS[view];
      return { showFolders: false, filtered: files.filter(f => {
        if (f.trashed) return false;
        const p = (f.filename||f.name||'').split('.');
        return p.length >= 2 && exts.includes(p[p.length-1].toLowerCase());
      })};
    }
    default: return { showFolders: true, filtered: files.filter(f => !f.trashed) };
  }
}

// ── Student Sidebar ───────────────────────────────────────────────────────────
function StudentSidebar({ activeView, onViewChange, studentInfo, onClose }) {
  const items = [
    { id: 'classes',     label: 'My Classes',  icon: 'fas fa-chalkboard' },
    { id: 'assignments', label: 'Assignments',  icon: 'fas fa-tasks' },
    { id: 'notes',       label: 'Notes',        icon: 'fas fa-book-open' },
  ];
  return (
    <aside className="sd-sidebar">
      {onClose && (
        <button className="sd-drawer-close" onClick={onClose}><i className="fas fa-times" /></button>
      )}
      <div className="sd-student-card">
        <div className="sd-student-card-label">Roll Number</div>
        <div className="sd-student-card-id">{studentInfo?.student_id || '—'}</div>
        <div className="sd-student-card-name">{studentInfo?.name || ''}</div>
      </div>
      <div className="sd-nav-section">
        <div className="sd-nav-title">Student</div>
        {items.map(item => (
          <div key={item.id} className={`sd-nav-item${activeView === item.id ? ' active' : ''}`}
            onClick={() => { onViewChange(item.id); onClose?.(); }}>
            <i className={item.icon} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sd-org-badge">
        <i className="fas fa-graduation-cap" />
        <div className="sd-org-badge-text">
          <strong>Organisation Mode</strong>
          <span>Classes &amp; assignments</span>
        </div>
      </div>
    </aside>
  );
}

// ── Normal Sidebar ────────────────────────────────────────────────────────────
function NormalSidebar({ activeView, onViewChange, storageUsed, onClose }) {
  const nav = [
    { id: 'myfiles',   label: 'My Files',   icon: 'fas fa-home' },
    { id: 'recent',    label: 'Recent',     icon: 'fas fa-clock' },
    { id: 'starred',   label: 'Starred',    icon: 'fas fa-star' },
    { id: 'trash',     label: 'Trash',      icon: 'fas fa-trash' },
  ];
  const types = [
    { id: 'images',    label: 'Images',     icon: 'fas fa-file-image' },
    { id: 'documents', label: 'Documents',  icon: 'fas fa-file-alt' },
    { id: 'videos',    label: 'Videos',     icon: 'fas fa-file-video' },
    { id: 'audio',     label: 'Audio',      icon: 'fas fa-file-audio' },
  ];
  const pct = STORAGE_TOTAL > 0 ? Math.min((storageUsed / STORAGE_TOTAL) * 100, 100) : 0;
  const CIRC = 2 * Math.PI * 28;
  const offset = CIRC * (1 - pct / 100);
  const stroke = pct > 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#667eea';
  return (
    <aside className="sd-sidebar sd-sidebar-normal">
      {onClose && (
        <button className="sd-drawer-close" onClick={onClose}><i className="fas fa-times" /></button>
      )}
      <div className="sd-nav-section">
        <div className="sd-nav-title">Navigation</div>
        {nav.map(item => (
          <div key={item.id} className={`sd-nav-item sd-nav-item-normal${activeView === item.id ? ' active-normal' : ''}`}
            onClick={() => { onViewChange(item.id); onClose?.(); }}>
            <i className={item.icon} /><span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sd-nav-section">
        <div className="sd-nav-title">File Types</div>
        {types.map(item => (
          <div key={item.id} className={`sd-nav-item sd-nav-item-normal${activeView === item.id ? ' active-normal' : ''}`}
            onClick={() => { onViewChange(item.id); onClose?.(); }}>
            <i className={item.icon} /><span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sd-storage-widget">
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ display: 'block', margin: '0 auto 0.75rem' }}>
          <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="32" cy="32" r="28" fill="none" stroke={stroke} strokeWidth="6"
            strokeDasharray={CIRC} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 32 32)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Storage Used</div>
        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
          {storageUsed >= 1e9 ? (storageUsed/1e9).toFixed(1)+' GB' : storageUsed >= 1e6 ? (storageUsed/1e6).toFixed(1)+' MB' : storageUsed >= 1e3 ? (storageUsed/1e3).toFixed(1)+' KB' : storageUsed+' B'} of 20 GB
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{pct.toFixed(1)}%</div>
      </div>
    </aside>
  );
}

// ── Classes View ──────────────────────────────────────────────────────────────
function ClassesView({ classes, loading, onSelectClass, onAcceptInvite, onRejectInvite }) {
  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><Spinner /></div>;
  const enrolled = classes.filter(c => c.status !== 'invited');
  const invites  = classes.filter(c => c.status === 'invited');
  return (
    <div className="sd-content-body">
      {invites.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="sd-section-label"><i className="fas fa-envelope" /> Pending Invites</div>
          {invites.map(cls => (
            <div key={cls.id} className="sd-invite-card">
              <div>
                <div className="sd-invite-name">{cls.name}</div>
                <div className="sd-invite-teacher"><i className="fas fa-chalkboard-teacher" /> {cls.teacher_name || 'Teacher'}</div>
              </div>
              <div className="sd-invite-actions">
                <button className="sd-btn-accept" onClick={() => onAcceptInvite(cls.id)}>Accept</button>
                <button className="sd-btn-reject" onClick={() => onRejectInvite(cls.id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {enrolled.length === 0 ? (
        <div className="sd-empty"><i className="fas fa-school" /><h3>No classes yet</h3><p>Your teacher will add you to a class</p></div>
      ) : (
        <div className="sd-class-grid">
          {enrolled.map((cls, i) => (
            <div key={cls.id} className="sd-class-card" onClick={() => onSelectClass(cls)}>
              <div className="sd-class-card-bar" />
              <div className="sd-class-icon">{CLASS_ICONS[i % CLASS_ICONS.length]}</div>
              <div className="sd-class-name">{cls.name}</div>
              <div className="sd-class-teacher"><i className="fas fa-chalkboard-teacher" /> {cls.teacher_name || 'Teacher'}</div>
              <div className="sd-class-meta">
                <span><i className="fas fa-tasks" /> {cls.assignment_count || 0} Assignments</span>
                {cls.subject && <span><i className="fas fa-book" /> {cls.subject}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Class Detail View ─────────────────────────────────────────────────────────
function ClassDetailView({ cls, notes, assignments, loadingDetail, onBack, onOpenAssignment }) {
  const [tab, setTab] = useState('notes');
  return (
    <div className="sd-content-body">
      <div className="sd-detail-header">
        <button className="sd-back-btn" onClick={onBack}><i className="fas fa-arrow-left" /> Back</button>
        <h3 className="sd-detail-title">{cls.name}</h3>
      </div>
      <div className="sd-tabs">
        {['notes','assignments'].map(t => (
          <button key={t} className={`sd-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'notes' ? <><i className="fas fa-book-open" /> Notes</> : <><i className="fas fa-tasks" /> Assignments</>}
          </button>
        ))}
      </div>
      {loadingDetail ? <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div> : tab === 'notes' ? (
        notes.length === 0 ? (
          <div className="sd-empty"><i className="fas fa-file-alt" /><h3>No notes yet</h3><p>Your teacher hasn't uploaded any notes</p></div>
        ) : (
          <div className="sd-notes-grid">
            {notes.map(n => (
              <div key={n.id} className="sd-note-card">
                <div className="sd-note-icon"><i className="fas fa-file-pdf" /></div>
                <div className="sd-note-title">{n.title}</div>
                <div className="sd-note-date">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</div>
                {n.file?.public_url && (
                  <div className="sd-note-actions">
                    <button className="sd-note-view" onClick={() => window.open(n.file.public_url, '_blank')}><i className="fas fa-eye" /> View</button>
                    <a className="sd-note-dl" href={n.file.public_url} download><i className="fas fa-download" /> Download</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        assignments.length === 0 ? (
          <div className="sd-empty"><i className="fas fa-tasks" /><h3>No assignments yet</h3></div>
        ) : (
          <div className="sd-assign-list">
            {assignments.map(a => (
              <div key={a.id} className="sd-assign-row" onClick={() => onOpenAssignment(a)}>
                <div className="sd-assign-icon"><i className="fas fa-file-alt" /></div>
                <div className="sd-assign-info">
                  <div className="sd-assign-title">{a.title}</div>
                  <div className="sd-assign-due"><i className="fas fa-calendar" /> Due: {a.due_date || 'No due date'}</div>
                </div>
                <span className="sd-marks-badge">{a.marks} marks</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Assignment Submit View ────────────────────────────────────────────────────
function AssignmentSubmitView({ assignment, uid, onBack }) {
  const [submitFile, setSubmitFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    async function check() {
      setLoadingExisting(true);
      const res = await getAssignmentSubmissions(assignment.id);
      if (res.success) {
        const studentId = localStorage.getItem('studentId');
        const mine = (res.data?.submitted ?? []).find(s => s.student_id === studentId);
        if (mine) setExisting(mine);
      }
      setLoadingExisting(false);
    }
    check();
  }, [assignment.id]);

  async function handleSubmit() {
    if (!submitFile) return;
    setSubmitting(true); setSubmitError(null);
    const res = await submitAssignment(assignment.id, submitFile, uid);
    setSubmitting(false);
    if (res.success) { setSubmitted(true); setSubmitFile(null); }
    else setSubmitError(res.error || res.data?.error || 'Submission failed');
  }

  return (
    <div className="sd-content-body">
      <div className="sd-detail-header">
        <button className="sd-back-btn" onClick={onBack}><i className="fas fa-arrow-left" /> Back</button>
        <div>
          <h3 className="sd-detail-title">{assignment.title}</h3>
          <span className="sd-assign-meta">{assignment.marks} marks · Due: {assignment.due_date || 'No due date'}</span>
        </div>
      </div>
      {assignment.description && (
        <div className="sd-assign-desc">{assignment.description}</div>
      )}
      {submitted ? (
        <div className="sd-success-box"><i className="fas fa-check-circle" /> Assignment submitted successfully!</div>
      ) : loadingExisting ? <Spinner /> : (
        <>
          {existing && (
            <div className="sd-existing-sub">
              <div className="sd-existing-header">
                <i className="fas fa-check-circle" style={{ color: '#11998e' }} />
                <span>Already Submitted</span>
                {existing.obtained_marks != null && (
                  <span className="sd-obtained-marks">{existing.obtained_marks}/{assignment.marks} marks</span>
                )}
              </div>
              {existing.file && (
                <div className="sd-existing-file">
                  <i className="fas fa-paperclip" style={{ color: '#11998e' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{existing.file.filename}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Submitted {existing.submitted_at ? new Date(existing.submitted_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                  {existing.file.public_url && (
                    <button className="sd-note-view" onClick={() => window.open(existing.file.public_url, '_blank')}>View</button>
                  )}
                </div>
              )}
              {existing.submit_count < 2 && (
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  You can resubmit once more ({2 - existing.submit_count} attempt remaining).
                </p>
              )}
            </div>
          )}
          {(!existing || existing.submit_count < 2) && (
            <div className="sd-submit-box">
              <h4 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
                {existing ? 'Resubmit Your Work' : 'Submit Your Work'}
              </h4>
              {submitError && <div className="sd-error-msg">{submitError}</div>}
              <div className="sd-dropzone" onClick={() => fileRef.current?.click()}>
                <i className="fas fa-paperclip" />
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{submitFile ? submitFile.name : 'Click to select file'}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{submitFile ? `${(submitFile.size/1024).toFixed(1)} KB` : 'PDF, DOC, images, etc.'}</div>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
              </div>
              <button className="sd-submit-btn" disabled={!submitFile || submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting…' : existing ? 'Resubmit Assignment' : 'Submit Assignment'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── All Assignments View ──────────────────────────────────────────────────────
function AllAssignmentsView({ classes, uid, onOpenAssignment }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      setLoading(true);
      const enrolled = classes.filter(c => c.status !== 'invited');
      const results = await Promise.all(enrolled.map(c => getClassAssignments(c.id)));
      const all = [];
      results.forEach((r, i) => {
        if (r.success) (r.data?.assignments ?? r.data ?? []).forEach(a => all.push({ ...a, className: enrolled[i].name }));
      });
      setItems(all); setLoading(false);
    }
    if (classes.length > 0) load(); else setLoading(false);
  }, [classes]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><Spinner /></div>;
  if (items.length === 0) return <div className="sd-empty"><i className="fas fa-tasks" /><h3>No assignments yet</h3></div>;
  return (
    <div className="sd-content-body">
      <div className="sd-assign-list">
        {items.map(a => (
          <div key={a.id} className="sd-assign-row" onClick={() => onOpenAssignment(a)}>
            <div className="sd-assign-icon"><i className="fas fa-file-alt" /></div>
            <div className="sd-assign-info">
              <div className="sd-assign-title">{a.title}</div>
              <div className="sd-assign-due"><i className="fas fa-chalkboard" /> {a.className} · <i className="fas fa-calendar" /> {a.due_date || 'No due date'}</div>
            </div>
            <span className="sd-marks-badge">{a.marks} marks</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── All Notes View ────────────────────────────────────────────────────────────
function AllNotesView({ classes }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      setLoading(true);
      const enrolled = classes.filter(c => c.status !== 'invited');
      const results = await Promise.all(enrolled.map(c => getClassNotes(c.id)));
      const all = [];
      results.forEach((r, i) => {
        if (r.success) (r.data?.notes ?? r.data ?? []).forEach(n => all.push({ ...n, className: enrolled[i].name }));
      });
      setItems(all); setLoading(false);
    }
    if (classes.length > 0) load(); else setLoading(false);
  }, [classes]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><Spinner /></div>;
  if (items.length === 0) return <div className="sd-empty"><i className="fas fa-book-open" /><h3>No notes yet</h3></div>;
  return (
    <div className="sd-content-body">
      <div className="sd-notes-grid">
        {items.map(n => (
          <div key={n.id} className="sd-note-card">
            <div className="sd-note-icon"><i className="fas fa-file-pdf" /></div>
            <div className="sd-note-title">{n.title}</div>
            <div className="sd-note-date">{n.className}</div>
            {n.file?.public_url && (
              <div className="sd-note-actions">
                <button className="sd-note-view" onClick={() => window.open(n.file.public_url, '_blank')}><i className="fas fa-eye" /> View</button>
                <a className="sd-note-dl" href={n.file.public_url} download><i className="fas fa-download" /> Download</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── File Card (inline, styled for student) ───────────────────────────────────
function SFileCard({ file, onPreview, onTrash, onRestore, onDelete, onStar }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const name = file.filename || file.name || 'Untitled';
  const ext = name.split('.').pop().toLowerCase();
  const icon = FILE_TYPE_EXTS.images.includes(ext) ? 'fas fa-file-image'
    : FILE_TYPE_EXTS.videos.includes(ext) ? 'fas fa-file-video'
    : FILE_TYPE_EXTS.audio.includes(ext) ? 'fas fa-file-audio'
    : ext === 'pdf' ? 'fas fa-file-pdf'
    : ['doc','docx'].includes(ext) ? 'fas fa-file-word'
    : ['xls','xlsx'].includes(ext) ? 'fas fa-file-excel'
    : 'fas fa-file';
  const color = FILE_TYPE_EXTS.images.includes(ext) ? '#10b981'
    : FILE_TYPE_EXTS.videos.includes(ext) ? '#8b5cf6'
    : FILE_TYPE_EXTS.audio.includes(ext) ? '#f59e0b'
    : ext === 'pdf' ? '#ef4444'
    : ['doc','docx'].includes(ext) ? '#2563eb'
    : '#667eea';
  const size = file.file_size >= 1e6 ? (file.file_size/1e6).toFixed(1)+' MB'
    : file.file_size >= 1e3 ? (file.file_size/1e3).toFixed(1)+' KB'
    : (file.file_size||0)+' B';

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="ud-file-card" onClick={() => onPreview(file)}>
      {file.starred && <div className="ud-star-badge"><i className="fas fa-star" /></div>}
      {file.trashed && <div className="ud-trash-badge">Trashed</div>}
      <div ref={ref} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
        <button className={`ud-file-menu${open ? ' active' : ''}`} onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
          <i className="fas fa-ellipsis-v" />
        </button>
        {open && (
          <div className="ud-dropdown">
            <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onPreview(file); setOpen(false); }}><i className="fas fa-eye" /> Preview</div>
            {file.public_url && <a className="ud-dropdown-item" href={file.public_url} download onClick={e => e.stopPropagation()}><i className="fas fa-download" /> Download</a>}
            <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onStar?.(file); setOpen(false); }}>
              <i className={file.starred ? 'fas fa-star' : 'far fa-star'} /> {file.starred ? 'Unstar' : 'Star'}
            </div>
            <div className="ud-dropdown-divider" />
            {file.trashed ? (
              <>
                <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onRestore(file); setOpen(false); }}><i className="fas fa-trash-restore" /> Restore</div>
                <div className="ud-dropdown-item danger" onClick={e => { e.stopPropagation(); onDelete(file); setOpen(false); }}><i className="fas fa-trash-alt" /> Delete Permanently</div>
              </>
            ) : (
              <div className="ud-dropdown-item danger" onClick={e => { e.stopPropagation(); onTrash(file); setOpen(false); }}><i className="fas fa-trash" /> Move to Trash</div>
            )}
          </div>
        )}
      </div>
      <div className="ud-file-icon"><i className={icon} style={{ color }} /></div>
      <div className="ud-file-name">{name}</div>
      <div className="ud-file-info">{size} · {formatDate(file.upload_time || file.date)}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const uid = user?.uid;

  const [isStudentMode, setIsStudentMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    files, folders, loading: fmLoading, error: fmError,
    currentView, searchQuery, storageInfo,
    setCurrentView, setSearchQuery,
    uploadFile, trashFile, restoreFile, deleteFile, emptyTrash,
    starFile, createFolder, deleteFolder, openFolder,
  } = useFileManager(uid, 'student');

  const [studentInfo, setStudentInfo] = useState(() => ({
    student_id: localStorage.getItem('studentId') || null,
    name: localStorage.getItem('userName') || '',
  }));
  const [classes, setClasses]                   = useState([]);
  const [classesLoading, setClassesLoading]     = useState(false);
  const [studentView, setStudentView]           = useState('classes');
  const [selectedClass, setSelectedClass]       = useState(null);
  const [classNotes, setClassNotes]             = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [loadingDetail, setLoadingDetail]       = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [notifications, setNotifications]       = useState([]);
  const [notifOpen, setNotifOpen]               = useState(false);
  const [previewFile, setPreviewFile]           = useState(null);
  const [folderName, setFolderName]             = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    getStudentByUID(uid).then(res => {
      if (res.success) {
        setStudentInfo(res.data);
        // Cache in localStorage for instant display on next load
        if (res.data.student_id) localStorage.setItem('studentId', res.data.student_id);
        if (res.data.name) localStorage.setItem('userName', res.data.name);
      } else {
        // Fallback to localStorage while API loads
        setStudentInfo({
          student_id: localStorage.getItem('studentId') || null,
          name: localStorage.getItem('userName') || '',
        });
      }
    });
    getNotifications(uid).then(res => {
      if (res.success) {
        const raw = res.data?.notifications ?? res.data ?? [];
        setNotifications((Array.isArray(raw) ? raw : []).map(n => ({
          ...n, read: n.read ?? n.is_read ?? false,
          message: n.message ?? n.body ?? n.title ?? '',
        })));
      }
    });
  }, [uid]);

  useEffect(() => {
    if (!isStudentMode || !uid) return;
    setClassesLoading(true);
    getStudentClasses(uid).then(res => {
      setClasses(res.success ? (res.data?.classes ?? res.data ?? []) : []);
      setClassesLoading(false);
    });
  }, [isStudentMode, uid]);

  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;

  async function handleMarkAllRead() {
    const res = await markAllNotificationsRead(uid);
    if (res.success) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }
  async function handleClearAll() {
    const res = await clearAllNotifications(uid);
    if (res.success) setNotifications([]);
  }
  async function handleUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    await uploadFile(file); e.target.value = '';
  }
  async function handleCreateFolder() {
    const name = window.prompt('Enter folder name:');
    if (name?.trim()) await createFolder(name.trim());
  }
  async function handleLogout() {
    await signOut(); localStorage.clear(); window.location.href = '/';
  }
  async function handleSelectClass(cls) {
    setSelectedClass(cls); setSelectedAssignment(null); setStudentView('class-detail'); setLoadingDetail(true);
    const [nr, ar] = await Promise.all([getClassNotes(cls.id), getClassAssignments(cls.id)]);
    setClassNotes(nr.success ? (nr.data?.notes ?? nr.data ?? []) : []);
    setClassAssignments(ar.success ? (ar.data?.assignments ?? ar.data ?? []) : []);
    setLoadingDetail(false);
  }
  async function handleAcceptInvite(classId) {
    const res = await acceptClassInvite(Number(classId) || classId, uid);
    if (res.success) {
      const r = await getStudentClasses(uid);
      if (r.success) setClasses(r.data?.classes ?? r.data ?? []);
    }
  }
  async function handleRejectInvite(classId) {
    const res = await rejectClassInvite(Number(classId) || classId, uid);
    if (res.success) setClasses(prev => prev.filter(c => String(c.id) !== String(classId)));
  }
  function handleStudentViewChange(view) {
    setStudentView(view); setSelectedClass(null); setSelectedAssignment(null);
  }

  const hdrGrad = isStudentMode ? SG : NG;
  if (fmLoading && !isStudentMode) return <Spinner />;
  const { showFolders, filtered } = filterFiles(files, currentView);

  const sidebarActiveView = isStudentMode
    ? (studentView === 'class-detail' || studentView === 'assignment-submit' ? 'classes' : studentView)
    : currentView;

  return (
    <div className="sd-root" style={{ background: isStudentMode ? '#fff5f7' : '#f8fafc' }}>
      <style>{SD_CSS}</style>

      {/* ── Header ── */}
      <header className="sd-header mode-header-transition" style={{ background: hdrGrad }}>
        <div className="sd-header-inner">
          <div className="sd-header-left">
            <button className="sd-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
              <i className="fas fa-bars" />
            </button>
            <div className="sd-logo"><i className="fas fa-cloud" /> Sky Vault</div>
            <div className="sd-toggle-wrap">
              <span className={`sd-toggle-label${!isStudentMode ? ' active' : ''}`}>Normal</span>
              <div className="sd-toggle" role="switch" aria-checked={isStudentMode}
                onClick={() => { setIsStudentMode(v => !v); setDrawerOpen(false); }}>
                <div className={`sd-toggle-thumb${isStudentMode ? ' on' : ''}`} />
              </div>
              <span className={`sd-toggle-label${isStudentMode ? ' active' : ''}`}>Student</span>
            </div>
          </div>
          <div className="sd-header-right">
            {!isStudentMode && (
              <div className="sd-search">
                <i className="fas fa-search" />
                <input type="text" placeholder="Search files…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            )}
            <button className="sd-icon-btn" onClick={() => setNotifOpen(v => !v)} aria-label="Notifications">
              <i className="fas fa-bell" />
              {unreadCount > 0 && <span className="sd-badge">{unreadCount}</span>}
            </button>
            <button className="sd-icon-btn" onClick={() => navigate('/user-profile')} aria-label="Profile">
              <i className="fas fa-user" />
            </button>
            <button className="sd-logout-btn" onClick={handleLogout}><i className="fas fa-sign-out-alt" /> <span className="sd-logout-text">Logout</span></button>
          </div>
        </div>
      </header>

      {/* ── Notification Panel ── */}
      {notifOpen && (
        <div className="sd-notif-panel">
          <div className="sd-notif-header">
            <h3>Notifications</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleMarkAllRead} className="sd-notif-action" style={{ color: '#f5576c' }}>Mark all read</button>
              <button onClick={handleClearAll} className="sd-notif-action" style={{ color: '#ef4444' }}>Clear all</button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>No notifications</p>
          ) : (
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notifications.map(n => {
                const isInvite = n.message?.startsWith('INVITE:') && !n.message?.includes(':ACCEPTED') && !n.message?.includes(':REJECTED');
                const wasActed = n.message?.includes('INVITE:') && (n.message?.includes(':ACCEPTED') || n.message?.includes(':REJECTED'));
                let classId = null, displayMsg = n.message;
                if (n.message?.includes('INVITE:')) {
                  const parts = n.message.split(':');
                  classId = parts[1];
                  const className = parts.slice(2).join(':').replace(':ACCEPTED','').replace(':REJECTED','');
                  displayMsg = `📬 Class invite: "${className}"`;
                }
                return (
                  <div key={n.id} className={`sd-notif-item${n.read ? '' : ' unread'}`}>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.875rem', color: '#334155', fontWeight: isInvite ? 600 : 400 }}>{displayMsg}</p>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDate(n.created_at)}</span>
                    {isInvite && classId && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button className="sd-btn-accept" style={{ flex: 1 }} onClick={async () => {
                          await handleAcceptInvite(classId);
                          // Tag notification so buttons don't reappear
                          await fetch(`/api/notifications/${n.id}/tag`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tag: 'ACCEPTED' })
                          });
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, message: x.message + ':ACCEPTED', read: true } : x));
                          setNotifOpen(false);
                        }}>✓ Accept</button>
                        <button className="sd-btn-reject" style={{ flex: 1 }} onClick={async () => {
                          await handleRejectInvite(classId);
                          await fetch(`/api/notifications/${n.id}/tag`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tag: 'REJECTED' })
                          });
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, message: x.message + ':REJECTED', read: true } : x));
                          setNotifOpen(false);
                        }}>✗ Decline</button>
                      </div>
                    )}
                    {/* Show acted status if already responded */}
                    {wasActed && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600,
                        color: n.message.includes(':ACCEPTED') ? '#065f46' : '#991b1b' }}>
                        {n.message.includes(':ACCEPTED') ? '✓ Accepted' : '✗ Declined'}
                      </div>
                    )}                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Mobile Drawer ── */}
      <div className={`sd-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`sd-drawer${drawerOpen ? ' open' : ''}`}>
        {isStudentMode ? (
          <StudentSidebar activeView={sidebarActiveView} onViewChange={handleStudentViewChange} studentInfo={studentInfo} onClose={() => setDrawerOpen(false)} />
        ) : (
          <NormalSidebar activeView={currentView} onViewChange={v => { setCurrentView(v); setFolderName(null); openFolder?.(null); }} storageUsed={storageInfo.usedBytes} onClose={() => setDrawerOpen(false)} />
        )}
        <button className="sd-drawer-logout" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" /> Logout
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="sd-layout">
        {/* Desktop sidebar */}
        <div className="sd-sidebar-wrap mode-fade" key={isStudentMode ? 'st' : 'nm'}>
          {isStudentMode ? (
            <StudentSidebar activeView={sidebarActiveView} onViewChange={handleStudentViewChange} studentInfo={studentInfo} />
          ) : (
            <NormalSidebar activeView={currentView} onViewChange={v => { setCurrentView(v); setFolderName(null); openFolder?.(null); }} storageUsed={storageInfo.usedBytes} />
          )}
        </div>

        {/* Content */}
        <main className="sd-main mode-fade" key={isStudentMode ? 'student' : 'personal'}
          style={{ background: isStudentMode ? 'linear-gradient(to bottom,#fff5f7,white)' : 'white',
            boxShadow: isStudentMode ? '0 4px 20px rgba(245,87,108,0.1)' : '0 4px 20px rgba(0,0,0,0.08)' }}>

          {isStudentMode ? (
            <>
              {/* Student content header */}
              <div className="sd-content-header" style={{ borderBottom: '1px solid #ffe5eb' }}>
                <h2 style={{ color: '#1e293b' }}>
                  {studentView === 'classes' ? 'My Classes'
                    : studentView === 'assignments' ? 'Assignments'
                    : studentView === 'notes' ? 'Notes'
                    : studentView === 'class-detail' ? selectedClass?.name
                    : selectedAssignment?.title}
                </h2>
              </div>
              {studentView === 'classes' && <ClassesView classes={classes} loading={classesLoading} onSelectClass={handleSelectClass} onAcceptInvite={handleAcceptInvite} onRejectInvite={handleRejectInvite} />}
              {studentView === 'class-detail' && selectedClass && <ClassDetailView cls={selectedClass} notes={classNotes} assignments={classAssignments} loadingDetail={loadingDetail} onBack={() => { setStudentView('classes'); setSelectedClass(null); }} onOpenAssignment={a => { setSelectedAssignment(a); setStudentView('assignment-submit'); }} />}
              {studentView === 'assignment-submit' && selectedAssignment && <AssignmentSubmitView assignment={selectedAssignment} uid={uid} onBack={() => { setStudentView('class-detail'); setSelectedAssignment(null); }} />}
              {studentView === 'assignments' && <AllAssignmentsView classes={classes} uid={uid} onOpenAssignment={a => { setSelectedAssignment(a); setStudentView('assignment-submit'); }} />}
              {studentView === 'notes' && <AllNotesView classes={classes} />}
            </>
          ) : (
            <>
              {/* Normal file manager header */}
              <div className="sd-content-header">
                <h2>
                  {folderName ? (
                    <span>
                      <button onClick={() => { openFolder?.(null); setFolderName(null); }} className="sd-folder-back">
                        <i className="fas fa-arrow-left" /> My Files
                      </button>
                      <span style={{ color: '#94a3b8', margin: '0 0.5rem' }}>/</span>
                      {folderName}
                    </span>
                  ) : ({ myfiles:'My Files', recent:'Recent', starred:'Starred', trash:'Trash', images:'Images', documents:'Documents', videos:'Videos', audio:'Audio' }[currentView] || 'My Files')}
                </h2>
                {fmError && <div className="sd-error-msg">{fmError}</div>}
                <div className="sd-action-row">
                  <button className="sd-btn-primary" onClick={() => fileInputRef.current?.click()}><i className="fas fa-upload" /> Upload Files</button>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
                  {!folderName && <button className="sd-btn-secondary" onClick={handleCreateFolder}><i className="fas fa-folder-plus" /> New Folder</button>}
                  {currentView === 'trash' && <button className="sd-btn-danger" onClick={() => emptyTrash()}><i className="fas fa-trash-alt" /> Empty Trash</button>}
                </div>
              </div>
              <div className="sd-file-grid">
                {showFolders && folders.map(folder => (
                  <div key={`folder-${folder.id}`} className="ud-file-card" onClick={() => { openFolder?.(folder.id); setFolderName(folder.name); }}>
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                      <button className="ud-file-menu" onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }} aria-label="Delete folder">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                    <div className="ud-file-icon"><i className="fas fa-folder" style={{ color: '#f59e0b' }} /></div>
                    <div className="ud-file-name">{folder.name}</div>
                    <div className="ud-file-info">{folder.file_count ?? 0} files</div>
                  </div>
                ))}
                {filtered.map(file => (
                  <SFileCard key={file.id} file={file} onPreview={setPreviewFile}
                    onTrash={f => trashFile(f.id)} onRestore={f => restoreFile(f.id)}
                    onDelete={f => deleteFile(f.id)} onStar={f => starFile(f.id)} />
                ))}
                {filtered.length === 0 && (!showFolders || folders.length === 0) && (
                  <div className="ud-empty-state">
                    <i className="fas fa-folder-open" /><h3>No files here</h3>
                    <p>Upload files or create a folder to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}

const SD_CSS = `
/* ── Root & Layout ── */
.sd-root{font-family:'Inter','Segoe UI',system-ui,sans-serif;min-height:100vh;overflow-x:hidden}
.sd-layout{max-width:1400px;margin:0 auto;padding:2rem;display:grid;grid-template-columns:280px 1fr;gap:2rem}
.sd-sidebar-wrap{height:fit-content;position:sticky;top:90px}

/* ── Header ── */
.sd-header{color:white;padding:1rem 0;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.sd-header-inner{max-width:1400px;margin:0 auto;padding:0 2rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}
.sd-header-left{display:flex;align-items:center;gap:1.25rem;flex-shrink:0}
.sd-header-right{display:flex;align-items:center;gap:1rem}
.sd-logo{display:flex;align-items:center;gap:0.6rem;font-size:1.4rem;font-weight:800;white-space:nowrap}
.sd-logo i{font-size:1.6rem}
.sd-hamburger{display:none;background:rgba(255,255,255,0.15);border:none;color:white;padding:0.7rem;border-radius:50%;cursor:pointer;font-size:1.1rem;align-items:center;justify-content:center}
.sd-toggle-wrap{display:flex;align-items:center;gap:0.6rem;background:rgba(255,255,255,0.15);padding:0.4rem 0.9rem;border-radius:50px}
.sd-toggle-label{font-size:0.85rem;font-weight:600;opacity:0.7;white-space:nowrap}
.sd-toggle-label.active{opacity:1}
.sd-toggle{position:relative;width:52px;height:26px;background:rgba(255,255,255,0.3);border-radius:50px;cursor:pointer;flex-shrink:0}
.sd-toggle-thumb{position:absolute;top:3px;left:3px;width:20px;height:20px;background:white;border-radius:50%;transition:left 0.3s ease;box-shadow:0 2px 6px rgba(0,0,0,0.2)}
.sd-toggle-thumb.on{left:29px}
.sd-search{position:relative}
.sd-search i{position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.7)}
.sd-search input{background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.2);border-radius:25px;padding:0.5rem 1rem 0.5rem 2.5rem;color:white;width:260px;outline:none;font-size:0.875rem}
.sd-search input::placeholder{color:rgba(255,255,255,0.7)}
.sd-icon-btn{background:rgba(255,255,255,0.15);border:none;color:white;padding:0.7rem;border-radius:50%;cursor:pointer;position:relative;transition:all 0.2s;font-size:1rem}
.sd-icon-btn:hover{background:rgba(255,255,255,0.25)}
.sd-badge{position:absolute;top:2px;right:2px;background:#ef4444;color:white;border-radius:50%;width:17px;height:17px;font-size:0.65rem;display:flex;align-items:center;justify-content:center;font-weight:700}
.sd-logout-btn{background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:white;padding:0.45rem 1.1rem;border-radius:25px;cursor:pointer;font-weight:600;font-size:0.875rem;white-space:nowrap;transition:all 0.2s;display:flex;align-items:center;gap:0.4rem}
.sd-logout-btn:hover{background:white;color:#667eea}
.sd-logout-btn .sd-logout-text{display:inline}

/* ── Sidebar ── */
.sd-sidebar{background:linear-gradient(135deg,#fff5f7,#ffe5eb);border-radius:16px;padding:1.5rem;box-shadow:0 4px 20px rgba(245,87,108,0.1)}
.sd-sidebar-normal{background:white;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.sd-student-card{background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:12px;padding:1.25rem;color:white;text-align:center;margin-bottom:1.5rem}
.sd-student-card-label{font-size:0.8rem;opacity:0.85;margin-bottom:0.4rem}
.sd-student-card-id{background:rgba(255,255,255,0.2);padding:0.4rem 1rem;border-radius:20px;font-size:1.05rem;font-weight:700;display:inline-block}
.sd-student-card-name{font-size:0.875rem;margin-top:0.5rem;opacity:0.9}
.sd-nav-section{margin-bottom:1.5rem}
.sd-nav-title{font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;color:#f5576c}
.sd-sidebar-normal .sd-nav-title{color:#64748b}
.sd-nav-item{display:flex;align-items:center;gap:0.75rem;padding:0.7rem 1rem;border-radius:12px;cursor:pointer;font-weight:500;color:#334155;margin-bottom:0.4rem;transition:all 0.2s}
.sd-nav-item:hover{background:rgba(245,87,108,0.08);color:#f5576c}
.sd-nav-item.active{background:linear-gradient(135deg,#f093fb,#f5576c);color:white}
.sd-nav-item-normal:hover{background:#f1f5f9;color:#667eea}
.sd-nav-item-normal.active-normal{background:linear-gradient(135deg,#667eea,#764ba2);color:white}
.sd-org-badge{display:flex;align-items:center;gap:0.75rem;background:linear-gradient(135deg,#ffe5eb,#ffd1dc);border-radius:12px;padding:1rem}
.sd-org-badge i{font-size:1.5rem;color:#f5576c;flex-shrink:0}
.sd-org-badge-text{display:flex;flex-direction:column}
.sd-org-badge-text strong{font-size:0.875rem;color:#be185d}
.sd-org-badge-text span{font-size:0.75rem;color:#9f1239}
.sd-storage-widget{background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:12px;padding:1.25rem;text-align:center}
.sd-drawer-close{position:absolute;top:1rem;right:1rem;background:rgba(0,0,0,0.08);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;font-size:1rem}

/* ── Main content ── */
.sd-main{border-radius:16px;min-height:600px;overflow:hidden}
.sd-content-header{padding:1.75rem 2rem 1.25rem;border-bottom:1px solid #e2e8f0}
.sd-content-header h2{font-size:1.6rem;font-weight:700;color:#1e293b;margin:0 0 1rem}
.sd-content-body{padding:1.75rem 2rem}
.sd-action-row{display:flex;gap:0.75rem;flex-wrap:wrap}
.sd-btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;padding:0.7rem 1.4rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;transition:all 0.2s}
.sd-btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.4)}
.sd-btn-secondary{background:#f8fafc;color:#64748b;border:2px solid #e2e8f0;padding:0.7rem 1.4rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;transition:all 0.2s}
.sd-btn-secondary:hover{background:#f1f5f9;transform:translateY(-2px)}
.sd-btn-danger{background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:0.7rem 1.4rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem}
.sd-file-grid{padding:1.75rem 2rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:1.25rem}
.sd-folder-back{background:none;border:none;color:#667eea;cursor:pointer;font-weight:700;font-size:1rem;padding:0;margin-right:0.5rem}
.sd-error-msg{color:#dc2626;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:0.6rem 1rem;font-size:0.875rem;margin-bottom:0.75rem}

/* ── Classes ── */
.sd-section-label{font-size:0.875rem;font-weight:700;color:#f5576c;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem}
.sd-invite-card{background:#fff5f7;border:2px solid #ffe5eb;border-radius:12px;padding:1rem 1.25rem;margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem}
.sd-invite-name{font-weight:700;color:#1e293b;margin-bottom:0.2rem}
.sd-invite-teacher{font-size:0.875rem;color:#64748b}
.sd-invite-actions{display:flex;gap:0.6rem}
.sd-btn-accept{background:linear-gradient(135deg,#f093fb,#f5576c);color:white;border:none;padding:0.45rem 1.1rem;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.875rem}
.sd-btn-reject{background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:0.45rem 1.1rem;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.875rem}
.sd-class-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem}
.sd-class-card{background:white;border:2px solid #ffe5eb;border-radius:16px;padding:1.5rem;cursor:pointer;position:relative;overflow:hidden;transition:all 0.3s}
.sd-class-card:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(245,87,108,0.15);border-color:#f5576c}
.sd-class-card-bar{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(135deg,#f093fb,#f5576c)}
.sd-class-icon{width:56px;height:56px;background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1rem}
.sd-class-name{font-size:1.15rem;font-weight:700;color:#1e293b;margin-bottom:0.4rem}
.sd-class-teacher{font-size:0.875rem;color:#64748b;margin-bottom:0.75rem}
.sd-class-meta{display:flex;gap:1rem;padding-top:0.75rem;border-top:1px solid #ffe5eb;font-size:0.8rem;color:#64748b;flex-wrap:wrap}
.sd-class-meta span{display:flex;align-items:center;gap:0.35rem}

/* ── Detail / Tabs ── */
.sd-detail-header{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
.sd-detail-title{font-size:1.4rem;font-weight:700;color:#1e293b;margin:0}
.sd-assign-meta{font-size:0.875rem;color:#64748b}
.sd-back-btn{background:rgba(100,116,139,0.1);color:#64748b;border:none;padding:0.6rem 1.25rem;border-radius:12px;font-weight:600;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:0.4rem}
.sd-tabs{display:flex;gap:0.25rem;margin-bottom:1.5rem;border-bottom:2px solid #ffe5eb}
.sd-tab{padding:0.7rem 1.4rem;border:none;background:none;font-weight:600;cursor:pointer;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:0.4rem;transition:all 0.2s}
.sd-tab.active{color:#f5576c;border-bottom-color:#f5576c}

/* ── Notes ── */
.sd-notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1.25rem}
.sd-note-card{background:#f8fafc;border:2px solid #ffe5eb;border-radius:12px;padding:1.25rem;text-align:center;transition:all 0.2s}
.sd-note-card:hover{border-color:#f5576c;box-shadow:0 4px 15px rgba(245,87,108,0.1)}
.sd-note-icon{font-size:2.25rem;color:#f5576c;margin-bottom:0.75rem}
.sd-note-title{font-weight:600;color:#1e293b;font-size:0.875rem;word-break:break-word;margin-bottom:0.25rem}
.sd-note-date{font-size:0.75rem;color:#64748b;margin-bottom:0.75rem}
.sd-note-actions{display:flex;gap:0.4rem}
.sd-note-view{flex:1;background:linear-gradient(135deg,#f093fb,#f5576c);color:white;border:none;padding:0.4rem 0.6rem;border-radius:8px;font-size:0.78rem;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:0.3rem}
.sd-note-dl{flex:1;background:#fff5f7;color:#f5576c;border:1px solid #ffe5eb;padding:0.4rem 0.6rem;border-radius:8px;font-size:0.78rem;font-weight:600;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:0.3rem}

/* ── Assignments ── */
.sd-assign-list{display:flex;flex-direction:column;gap:0.75rem}
.sd-assign-row{background:#f8fafc;border:2px solid #ffe5eb;border-radius:12px;padding:1rem 1.25rem;cursor:pointer;display:flex;align-items:center;gap:1rem;transition:all 0.2s}
.sd-assign-row:hover{border-color:#f5576c;box-shadow:0 4px 15px rgba(245,87,108,0.1)}
.sd-assign-icon{width:46px;height:46px;background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:1.1rem;flex-shrink:0}
.sd-assign-info{flex:1;min-width:0}
.sd-assign-title{font-weight:700;color:#1e293b;margin-bottom:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sd-assign-due{font-size:0.8rem;color:#64748b;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap}
.sd-marks-badge{background:#ffe5eb;color:#9d174d;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.8rem;font-weight:700;white-space:nowrap;flex-shrink:0}

/* ── Submit ── */
.sd-assign-desc{background:#fff5f7;border:1px solid #ffe5eb;border-radius:12px;padding:1rem;margin-bottom:1.5rem;color:#334155;font-size:0.9rem}
.sd-success-box{background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;padding:1.5rem;text-align:center;font-weight:700;color:#065f46;display:flex;align-items:center;justify-content:center;gap:0.75rem;font-size:1rem}
.sd-existing-sub{background:#f0fdf9;border:2px solid #6ee7b7;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem}
.sd-existing-header{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;font-weight:700;color:#065f46;flex-wrap:wrap}
.sd-obtained-marks{background:#d1fae5;color:#065f46;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.875rem;margin-left:auto}
.sd-existing-file{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;background:white;border-radius:10px;border:1px solid #d1fae5}
.sd-submit-box{background:white;border:2px solid #ffe5eb;border-radius:16px;padding:1.75rem}
.sd-dropzone{border:2px dashed #f5576c;border-radius:12px;padding:2rem;text-align:center;cursor:pointer;margin-bottom:1rem;transition:background 0.2s}
.sd-dropzone:hover{background:#fff5f7}
.sd-dropzone i{font-size:2rem;color:#f5576c;display:block;margin-bottom:0.5rem}
.sd-submit-btn{background:linear-gradient(135deg,#f093fb,#f5576c);color:white;border:none;padding:0.75rem 2rem;border-radius:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
.sd-submit-btn:disabled{background:#e2e8f0;color:#94a3b8;cursor:not-allowed}

/* ── Notifications ── */
.sd-notif-panel{position:fixed;top:80px;right:24px;width:360px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);z-index:500;padding:1.5rem}
.sd-notif-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
.sd-notif-header h3{margin:0;font-size:1.05rem;font-weight:700}
.sd-notif-action{background:none;border:none;cursor:pointer;font-size:0.8rem;font-weight:600}
.sd-notif-item{padding:0.75rem;border-radius:8px;margin-bottom:0.5rem;background:#f8fafc;border-left:3px solid #e2e8f0}
.sd-notif-item.unread{background:#fff5f7;border-left-color:#f5576c}

/* ── Empty state ── */
.sd-empty{text-align:center;padding:4rem 2rem;color:#64748b}
.sd-empty i{font-size:3.5rem;color:#fda4af;display:block;margin-bottom:1rem}
.sd-empty h3{font-size:1.2rem;color:#475569;margin-bottom:0.5rem}

/* ── Mobile drawer ── */
.sd-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;opacity:0;transition:opacity 0.3s}
.sd-overlay.open{display:block;opacity:1}
.sd-drawer{position:fixed;top:0;left:0;width:290px;height:100vh;background:white;z-index:201;overflow-y:auto;padding:1.5rem;transform:translateX(-100%);transition:transform 0.3s ease;visibility:hidden}
.sd-drawer.open{transform:translateX(0);visibility:visible;box-shadow:4px 0 20px rgba(0,0,0,0.15)}
.sd-drawer-logout{width:100%;margin-top:1.5rem;background:linear-gradient(135deg,#f093fb,#f5576c);color:white;border:none;padding:0.75rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;font-size:0.9rem}

/* ── Responsive ── */
@media(max-width:1024px){
  .sd-layout{grid-template-columns:1fr}
  .sd-sidebar-wrap{display:none}
}
@media(max-width:768px){
  .sd-hamburger{display:flex}
  .sd-layout{padding:1rem;gap:1rem}
  .sd-toggle-wrap{padding:0.35rem 0.7rem;gap:0.4rem}
  .sd-toggle-label{font-size:0.78rem}
  .sd-search{display:none}
  .sd-logout-btn .sd-logout-text{display:none}
  .sd-logout-btn{padding:0.55rem 0.7rem;border-radius:50%}
  .sd-header-inner{padding:0 1rem}
  .sd-logo{font-size:1.2rem}
  .sd-content-header{padding:1.25rem 1rem 1rem}
  .sd-content-header h2{font-size:1.3rem}
  .sd-content-body{padding:1rem}
  .sd-file-grid{padding:1rem;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:1rem}
  .sd-class-grid{grid-template-columns:1fr}
  .sd-notes-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
  .sd-notif-panel{width:calc(100vw - 2rem);right:1rem;left:1rem}
  .sd-assign-title{white-space:normal}
}
@media(max-width:480px){
  .sd-file-grid{grid-template-columns:repeat(2,1fr)}
  .sd-notes-grid{grid-template-columns:repeat(2,1fr)}
  .sd-header-right{gap:0.5rem}
  .sd-icon-btn{padding:0.55rem}
}
`;
