// Feature: html-to-react-migration
// Requirements: 9.1–9.10

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFileManager } from '../../hooks/useFileManager';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import FileCard from '../../components/FileCard';
import FilePreviewModal from '../../components/FilePreviewModal';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import {
  getTeacherClasses, createClass, deleteClass,
  lookupStudent, addStudentToClass, getClassStudents, removeStudentFromClass,
  uploadClassNote, getClassNotes, deleteClassNote,
  createAssignment, getClassAssignments, deleteAssignment,
  getAssignmentSubmissions, giveMarks,
  getNotifications, markAllNotificationsRead, clearAllNotifications,
} from '../../api/api';

const TEACHER_GRADIENT = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
const NORMAL_GRADIENT  = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
const STORAGE_TOTAL    = 20 * 1024 * 1024 * 1024;
const CLASS_ICONS      = ['🧮', '🔬', '💻', '📖', '⚛️', '🌍'];

const FILE_TYPE_EXTS = {
  images:    ['jpg','jpeg','png','gif','webp','svg','bmp'],
  documents: ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','md'],
  videos:    ['mp4','avi','mov','mkv','webm'],
  audio:     ['mp3','wav','ogg','aac','flac'],
};

function filterFiles(files, folders, view) {
  switch (view) {
    case 'myfiles':
      return { showFolders: true, filtered: files.filter(f => !f.trashed) };
    case 'recent':
      return { showFolders: false, filtered: files.filter(f => !f.trashed).sort((a,b) => new Date(b.date||b.upload_time||0)-new Date(a.date||a.upload_time||0)) };
    case 'starred':
      return { showFolders: false, filtered: files.filter(f => f.starred && !f.trashed) };
    case 'trash':
      return { showFolders: false, filtered: files.filter(f => f.trashed) };
    case 'images': case 'documents': case 'videos': case 'audio': {
      const exts = FILE_TYPE_EXTS[view];
      return { showFolders: false, filtered: files.filter(f => {
        if (f.trashed) return false;
        const parts = (f.name||f.filename||'').split('.');
        return parts.length >= 2 && exts.includes(parts[parts.length-1].toLowerCase());
      })};
    }
    default:
      return { showFolders: true, filtered: files.filter(f => !f.trashed) };
  }
}

function getViewTitle(view) {
  const titles = {
    myfiles:'My Files', recent:'Recent', starred:'Starred', trash:'Trash',
    images:'Images', documents:'Documents', videos:'Videos', audio:'Audio',
  };
  return titles[view] || 'My Files';
}

// ── Teacher Sidebar ───────────────────────────────────────────────────────────

function TeacherSidebar({ activeView, onViewChange, storageUsed, storageTotal }) {
  const navItems = [
    { id: 'classes',       label: 'My Classes',   icon: 'fas fa-chalkboard-teacher' },
    { id: 'assignments',   label: 'Assignments',   icon: 'fas fa-tasks' },
    { id: 'students',      label: 'Students',      icon: 'fas fa-users' },
    { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
  ];

  return (
    <aside style={{
      background: 'linear-gradient(135deg, #f0fdf9 0%, #d1fae5 100%)',
      borderRadius: 16, padding: '1.5rem',
      boxShadow: '0 4px 20px rgba(17,153,142,0.1)', height: 'fit-content',
    }}>
      {/* Teacher info card */}
      <div style={{
        background: TEACHER_GRADIENT, borderRadius: 12, padding: '1.25rem',
        color: 'white', textAlign: 'center', marginBottom: '1.5rem',
      }}>
        <i className="fas fa-chalkboard-teacher" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }} />
        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Teacher Dashboard</div>
      </div>

      {/* Nav items */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#11998e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
          Organisation
        </div>
        {navItems.map(item => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onViewChange(item.id)}
            onKeyDown={e => e.key === 'Enter' && onViewChange(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: 12, cursor: 'pointer',
              marginBottom: '0.5rem', fontWeight: 500,
              background: activeView === item.id ? TEACHER_GRADIENT : 'transparent',
              color: activeView === item.id ? 'white' : '#334155',
            }}
          >
            <i className={item.icon} style={{ width: 20, textAlign: 'center' }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Storage — only shown in personal mode context, hide in org sidebar */}
      <div style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
        <i className="fas fa-building" style={{ fontSize: '2rem', color: '#11998e', marginBottom: '0.5rem', display: 'block' }} />
        <div style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}>Organisation Mode</div>
        <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.25rem' }}>Managing classes &amp; students</div>
      </div>
    </aside>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 20, padding: '2rem', width: '90%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function FormGroup({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0',
  borderRadius: 10, fontSize: '0.95rem', color: '#334155', fontFamily: 'inherit',
  boxSizing: 'border-box', background: 'white',
};

// ── Classes View ──────────────────────────────────────────────────────────────

function ClassesView({ classes, loading, onSelectClass, onDeleteClass, onCreateClass }) {
  const CLASS_COLORS = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#11998e,#38ef7d)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
  ];
  const CLASS_FA_ICONS = ['fas fa-calculator','fas fa-flask','fas fa-laptop-code','fas fa-book-open','fas fa-atom','fas fa-globe'];

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>;

  return (
    <div style={{ padding: '2rem' }}>
      {classes.length === 0 ? (
        <div className="td-empty">
          <i className="fas fa-chalkboard-teacher" />
          <h3>No classes yet</h3>
          <p>Create your first class to get started</p>
        </div>
      ) : (
        <div className="td-class-grid">
          {classes.map((cls, i) => (
            <div
              key={cls.id}
              onClick={() => onSelectClass(cls)}
              style={{
                background: 'white', border: '2px solid #d1fae5', borderRadius: 16,
                padding: '1.5rem', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(17,153,142,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              {/* Top accent bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: CLASS_COLORS[i % CLASS_COLORS.length] }} />
              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); onDeleteClass(cls.id); }}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Delete class"
              >
                <i className="fas fa-trash" style={{ fontSize: '0.875rem' }} />
              </button>
              {/* Class icon */}
              <div style={{ width: 60, height: 60, background: CLASS_COLORS[i % CLASS_COLORS.length], borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'white', fontSize: '1.5rem' }}>
                <i className={CLASS_FA_ICONS[i % CLASS_FA_ICONS.length]} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem', paddingRight: '2.5rem' }}>{cls.name}</div>
              {cls.subject && (
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-book" style={{ color: '#11998e' }} /> {cls.subject}
                </div>
              )}
              {cls.description && <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{cls.description}</div>}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #d1fae5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                  <i className="fas fa-users" style={{ color: '#11998e' }} /><span>{cls.student_count || 0} Students</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                  <i className="fas fa-tasks" style={{ color: '#11998e' }} /><span>{cls.assignment_count || 0} Assignments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Class Detail View ─────────────────────────────────────────────────────────

function ClassDetailView({ cls, uid, onBack }) {
  const [activeTab, setActiveTab] = useState('notes');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [showUploadNoteModal, setShowUploadNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [noteUploading, setNoteUploading] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const noteFileRef = useRef(null);

  // Assignments state
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [showCreateAssignModal, setShowCreateAssignModal] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignMarks, setAssignMarks] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignCreating, setAssignCreating] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Students state
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState(null);

  useEffect(() => {
    loadNotes();
    loadAssignments();
    loadStudents();
  }, [cls.id]);

  async function loadNotes() {
    setNotesLoading(true);
    const res = await getClassNotes(cls.id);
    setNotes(res.success ? (res.data?.notes ?? res.data ?? []) : []);
    setNotesLoading(false);
  }

  async function loadAssignments() {
    setAssignmentsLoading(true);
    const res = await getClassAssignments(cls.id);
    setAssignments(res.success ? (res.data?.assignments ?? res.data ?? []) : []);
    setAssignmentsLoading(false);
  }

  async function loadStudents() {
    setStudentsLoading(true);
    const res = await getClassStudents(cls.id);
    setStudents(res.success ? (res.data?.students ?? res.data ?? []) : []);
    setStudentsLoading(false);
  }

  async function handleUploadNote() {
    if (!noteFile) return;
    setNoteUploading(true);
    setNoteError(null);
    const res = await uploadClassNote(cls.id, noteFile, uid, noteTitle || noteFile.name);
    setNoteUploading(false);
    if (res.success) {
      setShowUploadNoteModal(false);
      setNoteTitle('');
      setNoteFile(null);
      loadNotes();
    } else {
      setNoteError(res.error || 'Upload failed');
    }
  }

  async function handleDeleteNote(noteId) {
    const res = await deleteClassNote(noteId);
    if (res.success) setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  async function handleCreateAssignment() {
    if (!assignTitle.trim()) return;
    setAssignCreating(true);
    setAssignError(null);
    const res = await createAssignment(cls.id, assignTitle, assignDesc, Number(assignMarks) || 0, assignDueDate);
    setAssignCreating(false);
    if (res.success) {
      setShowCreateAssignModal(false);
      setAssignTitle(''); setAssignDesc(''); setAssignMarks(''); setAssignDueDate('');
      loadAssignments();
    } else {
      setAssignError(res.error || 'Failed to create assignment');
    }
  }

  async function handleDeleteAssignment(assignmentId) {
    const res = await deleteAssignment(assignmentId);
    if (res.success) setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  }

  async function handleAddStudent() {
    if (!studentEmail.trim()) return;
    setAddingStudent(true);
    setAddStudentError(null);
    const lookupRes = await lookupStudent(studentEmail.trim());
    if (!lookupRes.success) {
      setAddStudentError(lookupRes.error || 'Student not found');
      setAddingStudent(false);
      return;
    }
    const studentId = lookupRes.data?.student_id ?? lookupRes.data?.id;
    if (!studentId) {
      setAddStudentError('Student not found');
      setAddingStudent(false);
      return;
    }
    const addRes = await addStudentToClass(cls.id, studentId);
    setAddingStudent(false);
    if (addRes.success) {
      setShowAddStudentModal(false);
      setStudentEmail('');
      loadStudents();
    } else {
      setAddStudentError(addRes.error || 'Failed to add student');
    }
  }

  async function handleRemoveStudent(studentDbId) {
    const res = await removeStudentFromClass(cls.id, studentDbId);
    if (res.success) setStudents(prev => prev.filter(s => s.id !== studentDbId));
  }

  if (selectedAssignment) {
    return (
      <AssignmentSubmissionsView
        assignment={selectedAssignment}
        onBack={() => setSelectedAssignment(null)}
      />
    );
  }

  return (
    <div>
      {/* Back + title */}
      <div className="td-detail-header">
        <button className="td-back-btn" onClick={onBack}><i className="fas fa-arrow-left" /> Back</button>
        <h3 className="td-detail-title">{cls.name}</h3>
      </div>

      {/* Tabs */}
      <div className="td-tabs">
        {['notes', 'assignments', 'students'].map(tab => (
          <button key={tab} className={`td-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'notes' ? <><i className="fas fa-book-open" /> Notes</> : tab === 'assignments' ? <><i className="fas fa-tasks" /> Assignments</> : <><i className="fas fa-users" /> Students</>}
          </button>
        ))}
      </div>

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="td-tab-content">
          <div className="td-tab-header">
            <span style={{ fontWeight: 700, color: '#1e293b' }}>Class Notes</span>
            <button className="td-org-btn" onClick={() => setShowUploadNoteModal(true)}>
              <i className="fas fa-upload" /> Upload Note
            </button>
          </div>
          {notesLoading ? <Spinner /> : notes.length === 0 ? (
            <div className="td-empty"><i className="fas fa-file-alt" /><h3>No notes yet</h3></div>
          ) : (
            <div className="td-notes-grid">
              {notes.map(n => (
                <div key={n.id} style={{ background: '#f8fafc', border: '2px solid #d1fae5', borderRadius: 12, padding: '1.25rem', textAlign: 'center', position: 'relative' }}>
                  <button onClick={() => handleDeleteNote(n.id)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} aria-label="Delete note">
                    <i className="fas fa-trash" />
                  </button>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem', color: '#11998e' }}><i className="fas fa-file-pdf" /></div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', wordBreak: 'break-word' }}>{n.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</div>
                  {n.file?.public_url && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                      <button onClick={() => window.open(n.file.public_url, '_blank')} style={{ flex: 1, background: TEACHER_GRADIENT, color: 'white', border: 'none', padding: '0.4rem 0.5rem', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                        <i className="fas fa-eye" /> View
                      </button>
                      <a href={n.file.public_url} download style={{ flex: 1, background: '#f0fdf9', color: '#11998e', border: '1px solid #d1fae5', padding: '0.4rem 0.5rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <i className="fas fa-download" /> Download
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="td-tab-content">
          <div className="td-tab-header">
            <span style={{ fontWeight: 700, color: '#1e293b' }}>Assignments</span>
            <button className="td-org-btn" onClick={() => setShowCreateAssignModal(true)}>
              <i className="fas fa-plus" /> New Assignment
            </button>
          </div>
          {assignmentsLoading ? <Spinner /> : assignments.length === 0 ? (
            <div className="td-empty"><i className="fas fa-tasks" /><h3>No assignments yet</h3></div>
          ) : (
            <div className="td-assign-list">
              {assignments.map(a => (
                <div key={a.id} className="td-assign-row">
                  <div onClick={() => setSelectedAssignment(a)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, cursor: 'pointer', minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, background: TEACHER_GRADIENT, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                      <i className="fas fa-file-alt" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Due: {a.due_date || 'No due date'}</div>
                    </div>
                    <span className="td-marks-badge">{a.marks} marks</span>
                  </div>
                  <button onClick={() => handleDeleteAssignment(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.4rem', flexShrink: 0 }} aria-label="Delete">
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="td-tab-content">
          <div className="td-tab-header">
            <span style={{ fontWeight: 700, color: '#1e293b' }}>Enrolled Students</span>
            <button className="td-org-btn" onClick={() => setShowAddStudentModal(true)}>
              <i className="fas fa-plus" /> Add Student
            </button>
          </div>
          {studentsLoading ? <Spinner /> : students.length === 0 ? (
            <div className="td-empty"><i className="fas fa-users" /><h3>No students yet</h3></div>
          ) : (
            <div>
              {students.map(s => (
                <div key={s.id} className="td-student-row">
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: TEACHER_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                    {(s.name || s.email || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || s.email || 'Student'}</div>
                    {s.student_id && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {s.student_id}</div>}
                  </div>
                  <button onClick={() => handleRemoveStudent(s.id)} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Note Modal */}
      {showUploadNoteModal && (
        <Modal title="Upload Class Note" onClose={() => setShowUploadNoteModal(false)}>
          <ErrorMessage message={noteError} />
          <FormGroup label="Title">
            <input style={inputStyle} value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Note title" />
          </FormGroup>
          <FormGroup label="File">
            <div
              onClick={() => noteFileRef.current?.click()}
              style={{ border: '2px dashed #11998e', borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: noteFile ? '#f0fdf9' : 'white' }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📎</div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{noteFile ? noteFile.name : 'Click to select file'}</div>
              <input ref={noteFileRef} type="file" style={{ display: 'none' }} onChange={e => setNoteFile(e.target.files?.[0] || null)} />
            </div>
          </FormGroup>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={() => setShowUploadNoteModal(false)} style={{ background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={handleUploadNote}
              disabled={!noteFile || noteUploading}
              style={{ background: noteFile && !noteUploading ? TEACHER_GRADIENT : '#e2e8f0', color: noteFile && !noteUploading ? 'white' : '#94a3b8', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: noteFile && !noteUploading ? 'pointer' : 'not-allowed' }}
            >
              {noteUploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </Modal>
      )}

      {/* Create Assignment Modal */}
      {showCreateAssignModal && (
        <Modal title="Create Assignment" onClose={() => setShowCreateAssignModal(false)}>
          <ErrorMessage message={assignError} />
          <FormGroup label="Title">
            <input style={inputStyle} value={assignTitle} onChange={e => setAssignTitle(e.target.value)} placeholder="Assignment title" />
          </FormGroup>
          <FormGroup label="Description">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={assignDesc} onChange={e => setAssignDesc(e.target.value)} placeholder="Description (optional)" />
          </FormGroup>
          <FormGroup label="Marks">
            <input style={inputStyle} type="number" value={assignMarks} onChange={e => setAssignMarks(e.target.value)} placeholder="Total marks" min="0" />
          </FormGroup>
          <FormGroup label="Due Date">
            <input style={inputStyle} type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} />
          </FormGroup>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={() => setShowCreateAssignModal(false)} style={{ background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={handleCreateAssignment}
              disabled={!assignTitle.trim() || assignCreating}
              style={{ background: assignTitle.trim() && !assignCreating ? TEACHER_GRADIENT : '#e2e8f0', color: assignTitle.trim() && !assignCreating ? 'white' : '#94a3b8', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: assignTitle.trim() && !assignCreating ? 'pointer' : 'not-allowed' }}
            >
              {assignCreating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <Modal title="Add Student" onClose={() => setShowAddStudentModal(false)}>
          <ErrorMessage message={addStudentError} />
          <FormGroup label="Student Email">
            <input style={inputStyle} type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="student@example.com" />
          </FormGroup>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={() => setShowAddStudentModal(false)} style={{ background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={handleAddStudent}
              disabled={!studentEmail.trim() || addingStudent}
              style={{ background: studentEmail.trim() && !addingStudent ? TEACHER_GRADIENT : '#e2e8f0', color: studentEmail.trim() && !addingStudent ? 'white' : '#94a3b8', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: studentEmail.trim() && !addingStudent ? 'pointer' : 'not-allowed' }}
            >
              {addingStudent ? 'Adding…' : 'Add Student'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Assignment Submissions View ───────────────────────────────────────────────

function AssignmentSubmissionsView({ assignment, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markInputs, setMarkInputs] = useState({});
  const [givingMarks, setGivingMarks] = useState({});
  const [markErrors, setMarkErrors] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getAssignmentSubmissions(assignment.id);
      // Backend returns { submitted: [...], pending: [...] }
      const submitted = res.success ? (res.data?.submitted ?? []) : [];
      const pending = res.success ? (res.data?.pending ?? []) : [];
      // Normalise field names
      const list = [
        ...submitted.map(s => ({ ...s, student_name: s.name, file_url: s.file?.public_url, file_name: s.file?.filename, marks: s.obtained_marks, submitted: true })),
        ...pending.map(s => ({ ...s, student_name: s.name, submitted: false })),
      ];
      setSubmissions(list);
      const inputs = {};
      list.forEach(s => { if (s.marks != null) inputs[s.student_id || s.id] = String(s.marks); });
      setMarkInputs(inputs);
      setLoading(false);
    }
    load();
  }, [assignment.id]);

  async function handleGiveMarks(submission) {
    const key = submission.student_id || submission.id;
    const marks = Number(markInputs[key]);
    if (isNaN(marks)) return;
    setGivingMarks(prev => ({ ...prev, [key]: true }));
    setMarkErrors(prev => ({ ...prev, [key]: null }));
    const res = await giveMarks(assignment.id, submission.student_db_id || submission.student_id || submission.id, marks);
    setGivingMarks(prev => ({ ...prev, [key]: false }));
    if (res.success) {
      setSubmissions(prev => prev.map(s => (s.student_id || s.id) === key ? { ...s, marks } : s));
    } else {
      setMarkErrors(prev => ({ ...prev, [key]: res.error || 'Failed to save marks' }));
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          ← Back
        </button>
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{assignment.title}</h3>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{assignment.marks} marks · Due: {assignment.due_date || 'No due date'}</span>
        </div>
      </div>

      {assignment.description && (
        <div style={{ background: '#f0fdf9', border: '1px solid #d1fae5', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, color: '#334155' }}>{assignment.description}</p>
        </div>
      )}

      {loading ? <Spinner /> : submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3>No submissions yet</h3>
        </div>
      ) : (
        <div>
          {submissions.map(sub => {
            const key = sub.student_id || sub.id;
            return (
              <div key={key} style={{ background: '#f8fafc', border: '2px solid #d1fae5', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: TEACHER_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                    {(sub.student_name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{sub.student_name || 'Student'}</div>
                    {sub.student_id_tag && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {sub.student_id_tag}</div>}
                  </div>
                  {sub.marks != null && (
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.875rem', fontWeight: 600 }}>
                      {sub.marks}/{assignment.marks}
                    </span>
                  )}
                </div>

                {/* Submitted file */}
                {(sub.file_url || sub.file?.public_url) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem', color: '#11998e' }}>📎</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{sub.file_name || 'Submission file'}</div>
                    </div>
                    <button
                      onClick={() => window.open(sub.file_url || sub.file?.public_url, '_blank')}
                      style={{ background: TEACHER_GRADIENT, color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View
                    </button>
                  </div>
                )}

                {/* Give marks */}
                {markErrors[key] && <ErrorMessage message={markErrors[key]} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <input
                    type="number"
                    min="0"
                    max={assignment.marks}
                    value={markInputs[key] ?? ''}
                    onChange={e => setMarkInputs(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Marks (max ${assignment.marks})`}
                    style={{ ...inputStyle, width: 180 }}
                  />
                  <button
                    onClick={() => handleGiveMarks(sub)}
                    disabled={givingMarks[key]}
                    style={{ background: givingMarks[key] ? '#e2e8f0' : TEACHER_GRADIENT, color: givingMarks[key] ? '#94a3b8' : 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 600, cursor: givingMarks[key] ? 'not-allowed' : 'pointer' }}
                  >
                    {givingMarks[key] ? 'Saving…' : 'Give Marks'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Notifications View ────────────────────────────────────────────────────────

function NotificationsView({ notifications, onMarkAllRead, onClearAll }) {
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Notifications</h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', color: '#11998e', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Mark all read</button>
          <button onClick={onClearAll} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Clear all</button>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <h3>No notifications</h3>
        </div>
      ) : (
        <div>
          {notifications.map(n => (
            <div key={n.id} style={{
              display: 'flex', gap: '1rem', padding: '1rem', borderRadius: 12, marginBottom: '0.75rem',
              background: (n.read || n.is_read) ? '#f8fafc' : '#f0fdf9',
              border: `1px solid ${(n.read || n.is_read) ? '#e2e8f0' : '#a7f3d0'}`,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: TEACHER_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                🔔
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{n.title || n.message}</div>
                {n.title && n.message && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{n.message}</div>}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{n.created_at}</div>
              </div>
              {!(n.read || n.is_read) && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#11998e', flexShrink: 0, marginTop: '0.5rem' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── All Assignments View (across all classes) ─────────────────────────────────

function AllAssignmentsView({ classes }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results = await Promise.all(classes.map(c => getClassAssignments(c.id)));
      const all = [];
      results.forEach((r, i) => {
        if (r.success) {
          const list = r.data?.assignments ?? r.data ?? [];
          list.forEach(a => all.push({ ...a, className: classes[i].name }));
        }
      });
      setItems(all);
      setLoading(false);
    }
    if (classes.length > 0) load();
    else setLoading(false);
  }, [classes]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>;
  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
      <h3>No assignments yet</h3>
    </div>
  );

  return (
    <div style={{ padding: '2rem' }}>
      {items.map(a => (
        <div key={a.id} style={{ background: '#f8fafc', border: '2px solid #d1fae5', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 50, height: 50, background: TEACHER_GRADIENT, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem', flexShrink: 0 }}>📝</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>{a.title}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{a.className} · Due: {a.due_date || 'No due date'}</div>
          </div>
          <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.875rem', fontWeight: 600 }}>{a.marks} marks</span>
        </div>
      ))}
    </div>
  );
}

// ── All Students View (across all classes) ────────────────────────────────────

function AllStudentsView({ classes }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results = await Promise.all(classes.map(c => getClassStudents(c.id)));
      const seen = new Set();
      const all = [];
      results.forEach((r, i) => {
        if (r.success) {
          const list = r.data?.students ?? r.data ?? [];
          list.forEach(s => {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              all.push({ ...s, className: classes[i].name });
            }
          });
        }
      });
      setItems(all);
      setLoading(false);
    }
    if (classes.length > 0) load();
    else setLoading(false);
  }, [classes]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>;
  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
      <h3>No students yet</h3>
    </div>
  );

  return (
    <div style={{ padding: '2rem' }}>
      {items.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.5rem', background: '#f8fafc', border: '1px solid #d1fae5' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: TEACHER_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
            {(s.name || s.email || 'S').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.name || s.email || 'Student'}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.className}</div>
          </div>
          {s.student_id && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {s.student_id}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const uid = user?.uid;

  // Mode toggle: false = Personal (file manager), true = Organisation (teacher)
  const [isOrgMode, setIsOrgMode] = useState(false);

  // File manager (Personal mode)
  const {
    files, folders, loading: fmLoading, error: fmError,
    currentView, searchQuery, storageInfo,
    setCurrentView, setSearchQuery,
    uploadFile, trashFile, restoreFile, deleteFile, emptyTrash,
    starFile, createFolder, deleteFolder,
  } = useFileManager(uid, 'teacher');

  // Org mode state
  const [classes, setClasses]               = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [orgView, setOrgView]               = useState('classes');
  const [selectedClass, setSelectedClass]   = useState(null);

  // Create class modal
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [className, setClassName]     = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [classDesc, setClassDesc]     = useState('');
  const [classOrgId, setClassOrgId]   = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  const [createClassError, setCreateClassError] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen]         = useState(false);

  const fileInputRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);

  // Load notifications on mount
  useEffect(() => {
    if (!uid) return;
    getNotifications(uid).then(res => {
      if (res.success) {
        const raw = res.data?.notifications ?? res.data ?? [];
        setNotifications((Array.isArray(raw) ? raw : []).map(n => ({
          ...n, read: n.read ?? n.is_read ?? false,
          title: n.title || n.body || '',
          message: n.body || n.message || ''
        })));
      }
    });
  }, [uid]);

  // Load classes when entering org mode
  useEffect(() => {
    if (!isOrgMode || !uid) return;
    setClassesLoading(true);
    getTeacherClasses(uid).then(res => {
      const list = res.success ? (res.data?.classes ?? res.data ?? []) : [];
      setClasses(list);
      setClassesLoading(false);
    });
  }, [isOrgMode, uid]);

  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;

  async function handleMarkAllRead() {
    if (!uid) return;
    const res = await markAllNotificationsRead(uid);
    if (res.success) setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
  }

  async function handleClearAll() {
    if (!uid) return;
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
    if (!name?.trim()) return;
    await createFolder(name.trim());
  }

  async function handleLogout() {
    await signOut();
    localStorage.clear();
    window.location.href = '/';
  }

  async function handleCreateClass() {
    if (!className.trim()) return;
    setCreatingClass(true);
    setCreateClassError(null);
    const res = await createClass(uid, classOrgId || null, className, classSubject, classDesc);
    setCreatingClass(false);
    if (res.success) {
      setShowCreateClassModal(false);
      setClassName(''); setClassSubject(''); setClassDesc(''); setClassOrgId('');
      // Refresh classes
      const refreshRes = await getTeacherClasses(uid);
      setClasses(refreshRes.success ? (refreshRes.data?.classes ?? refreshRes.data ?? []) : []);
    } else {
      setCreateClassError(res.error || 'Failed to create class');
    }
  }

  async function handleDeleteClass(classId) {
    if (!window.confirm('Delete this class? This cannot be undone.')) return;
    const res = await deleteClass(classId);
    if (res.success) setClasses(prev => prev.filter(c => c.id !== classId));
  }

  function handleOrgViewChange(view) {
    setOrgView(view);
    setSelectedClass(null);
  }

  const headerGradient = isOrgMode ? TEACHER_GRADIENT : NORMAL_GRADIENT;
  const { showFolders, filtered } = filterFiles(files, folders, currentView);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (fmLoading && !isOrgMode) return <Spinner />;

  return (
    <div className="mode-bg-transition td-root" style={{ background: isOrgMode ? '#f0fdf9' : '#f8fafc' }}>
      {/* Header */}
      <header className="mode-header-transition td-header" style={{ background: headerGradient }}>
        <div className="td-header-inner">
          <div className="td-header-left">
            <button className="td-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
              <i className="fas fa-bars" />
            </button>
            <div className="td-logo"><i className="fas fa-cloud" /> Sky Vault</div>
            <div className="td-toggle-wrap">
              <span className={`td-toggle-label${!isOrgMode ? ' active' : ''}`}>Personal</span>
              <div className="td-toggle" role="switch" aria-checked={isOrgMode}
                tabIndex={0} onClick={() => setIsOrgMode(v => !v)} onKeyDown={e => e.key === 'Enter' && setIsOrgMode(v => !v)}>
                <div className={`td-toggle-thumb${isOrgMode ? ' on' : ''}`} />
              </div>
              <span className={`td-toggle-label${isOrgMode ? ' active' : ''}`}>Org</span>
            </div>
          </div>
          <div className="td-header-right">
            {!isOrgMode && (
              <div className="td-search">
                <i className="fas fa-search" />
                <input type="text" placeholder="Search files..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} aria-label="Search" />
              </div>
            )}
            <button onClick={() => setNotifOpen(v => !v)} aria-label="Notifications"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer', position: 'relative' }}>
              <i className="fas fa-bell" />
              {unreadCount > 0 && (
                <span data-testid="unread-badge" style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => navigate('/user-profile')} aria-label="Profile"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer' }}>
              <i className="fas fa-user" />
            </button>
            <button onClick={handleLogout} className="td-logout-btn">
              <i className="fas fa-sign-out-alt" /> <span className="td-logout-text">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification panel */}
      {notifOpen && (
        <div data-testid="notification-panel" style={{ position: 'fixed', top: 80, right: 24, width: 360, background: 'white', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 500, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Notifications</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#11998e', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Mark all read</button>
              <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Clear all</button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>No notifications</p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {notifications.map(n => {
                const utcStr = n.created_at ? (n.created_at.endsWith('Z') || n.created_at.includes('+') ? n.created_at : n.created_at + 'Z') : null;
                const dateStr = utcStr ? (() => { const d = new Date(utcStr); const diff = Math.floor((Date.now()-d)/60000); if(diff<1) return 'Just now'; if(diff<60) return `${diff} min ago`; if(diff<1440) return `${Math.floor(diff/60)} hr ago`; return d.toLocaleDateString(); })() : '';
                return (
                  <div key={n.id} style={{ padding: '0.75rem', borderRadius: 8, marginBottom: '0.5rem', background: (n.read || n.is_read) ? '#f8fafc' : '#f0fdf9', borderLeft: (n.read || n.is_read) ? '3px solid #e2e8f0' : '3px solid #11998e' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{n.title || n.message}</p>
                    {n.title && n.message && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>{n.message}</p>}
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{dateStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mobile drawer overlay */}
      <div className={`td-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`td-drawer${drawerOpen ? ' open' : ''}`}>
        <button className="td-drawer-close" onClick={() => setDrawerOpen(false)}><i className="fas fa-times" /></button>
        <div style={{ marginTop: '2.5rem' }}>
          {isOrgMode ? (
            /* Teacher org nav inline */
            <>
              <div style={{ background: 'linear-gradient(135deg,#11998e,#38ef7d)', borderRadius: 12, padding: '1.25rem', color: 'white', textAlign: 'center', marginBottom: '1.5rem' }}>
                <i className="fas fa-chalkboard-teacher" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }} />
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Teacher Dashboard</div>
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#11998e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Organisation</div>
              {[
                { id: 'classes',       label: 'My Classes',   icon: 'fas fa-chalkboard-teacher' },
                { id: 'assignments',   label: 'Assignments',  icon: 'fas fa-tasks' },
                { id: 'students',      label: 'Students',     icon: 'fas fa-users' },
                { id: 'notifications', label: 'Notifications',icon: 'fas fa-bell' },
              ].map(item => (
                <div key={item.id}
                  onClick={() => { handleOrgViewChange(item.id); setDrawerOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 12, cursor: 'pointer', marginBottom: '0.4rem', fontWeight: 500, background: (orgView === 'class-detail' ? 'classes' : orgView) === item.id ? 'linear-gradient(135deg,#11998e,#38ef7d)' : 'transparent', color: (orgView === 'class-detail' ? 'classes' : orgView) === item.id ? 'white' : '#334155' }}>
                  <i className={item.icon} style={{ width: 20, textAlign: 'center' }} /><span>{item.label}</span>
                </div>
              ))}
            </>
          ) : (
            /* Personal file manager nav inline */
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>Navigation</div>
              {[
                { id: 'myfiles',   label: 'My Files',   icon: 'fas fa-home' },
                { id: 'recent',    label: 'Recent',     icon: 'fas fa-clock' },
                { id: 'starred',   label: 'Starred',    icon: 'fas fa-star' },
                { id: 'trash',     label: 'Trash',      icon: 'fas fa-trash' },
              ].map(item => (
                <div key={item.id} className={`ud-sidebar-item${currentView === item.id ? ' active' : ''}`}
                  onClick={() => { setCurrentView(item.id); setDrawerOpen(false); }}>
                  <i className={item.icon} style={{ width: 20, textAlign: 'center' }} /><span>{item.label}</span>
                </div>
              ))}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '1rem 0 0.75rem' }}>File Types</div>
              {[
                { id: 'images',    label: 'Images',    icon: 'fas fa-file-image' },
                { id: 'documents', label: 'Documents', icon: 'fas fa-file-alt' },
                { id: 'videos',    label: 'Videos',    icon: 'fas fa-file-video' },
                { id: 'audio',     label: 'Audio',     icon: 'fas fa-file-audio' },
              ].map(item => (
                <div key={item.id} className={`ud-sidebar-item${currentView === item.id ? ' active' : ''}`}
                  onClick={() => { setCurrentView(item.id); setDrawerOpen(false); }}>
                  <i className={item.icon} style={{ width: 20, textAlign: 'center' }} /><span>{item.label}</span>
                </div>
              ))}
            </>
          )}
          <button className="td-drawer-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" /> Logout
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="ud-main-container">

        {/* Sidebar */}
        <div key={isOrgMode ? 'org-sidebar' : 'personal-sidebar'} className="mode-fade td-desktop-sidebar">
        {isOrgMode ? (
          <TeacherSidebar
            activeView={orgView === 'class-detail' ? 'classes' : orgView}
            onViewChange={handleOrgViewChange}
            storageUsed={storageInfo.usedBytes}
            storageTotal={STORAGE_TOTAL}
          />
        ) : (
          <Sidebar
            activeView={currentView}
            onViewChange={setCurrentView}
            storageUsed={storageInfo.usedBytes}
            storageTotal={STORAGE_TOTAL}
          />
        )}
        </div>

        {/* Content */}
        <main
          key={isOrgMode ? 'org' : 'personal'}
          className="mode-fade"
          style={{
          background: isOrgMode ? 'linear-gradient(to bottom, #f0fdf9 0%, white 100%)' : 'white',
          borderRadius: 16,
          boxShadow: isOrgMode ? '0 4px 20px rgba(17,153,142,0.1)' : '0 4px 20px rgba(0,0,0,0.08)',
          minHeight: 600,
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {isOrgMode ? (
            /* ── Organisation Mode ── */
            <>
              {/* Classes view */}
              {(orgView === 'classes' || orgView === 'class-detail') && !selectedClass && (
                <>
                  <div className="td-org-header">
                    <h2>My Classes</h2>
                    <button className="td-org-btn" onClick={() => setShowCreateClassModal(true)}>
                      <i className="fas fa-plus" /> Create Class
                    </button>
                  </div>
                  <ClassesView
                    classes={classes}
                    loading={classesLoading}
                    onSelectClass={cls => { setSelectedClass(cls); setOrgView('class-detail'); }}
                    onDeleteClass={handleDeleteClass}
                    onCreateClass={() => setShowCreateClassModal(true)}
                  />
                </>
              )}

              {/* Class detail view */}
              {orgView === 'class-detail' && selectedClass && (
                <ClassDetailView
                  cls={selectedClass}
                  uid={uid}
                  onBack={() => { setSelectedClass(null); setOrgView('classes'); }}
                />
              )}

              {/* Assignments view */}
              {orgView === 'assignments' && (
                <>
                  <div className="td-org-header"><h2>Assignments</h2></div>
                  <AllAssignmentsView classes={classes} />
                </>
              )}

              {/* Students view */}
              {orgView === 'students' && (
                <>
                  <div className="td-org-header"><h2>Students</h2></div>
                  <AllStudentsView classes={classes} />
                </>
              )}

              {/* Notifications view */}
              {orgView === 'notifications' && (
                <>
                  <div className="td-org-header"><h2>Notifications</h2></div>
                  <NotificationsView
                    notifications={notifications}
                    onMarkAllRead={handleMarkAllRead}
                    onClearAll={handleClearAll}
                  />
                </>
              )}
            </>
          ) : (
            /* ── Personal Mode (File Manager) ── */
            <>
              <div className="ud-content-header">
                <h2>{getViewTitle(currentView)}</h2>
                <ErrorMessage message={fmError} />
                <div className="ud-action-buttons">
                  <button className="ud-btn-primary" onClick={() => fileInputRef.current?.click()}>
                    <i className="fas fa-upload" /> Upload Files
                  </button>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
                  <button className="ud-btn-secondary" onClick={handleCreateFolder}>
                    <i className="fas fa-folder-plus" /> New Folder
                  </button>
                  {currentView === 'trash' && (
                    <button className="ud-btn-danger" onClick={() => emptyTrash()}>
                      <i className="fas fa-trash-alt" /> Empty Trash
                    </button>
                  )}
                </div>
              </div>

              <div className="ud-file-grid">
                {showFolders && folders.map(folder => (
                  <div key={`folder-${folder.id}`} className="ud-file-card">
                    <button
                      onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                      style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#64748b' }}
                      aria-label="Delete folder"
                    >
                      <i className="fas fa-trash" />
                    </button>
                    <div className="ud-file-icon"><i className="fas fa-folder" style={{ color: '#f59e0b' }} /></div>
                    <div className="ud-file-name">{folder.name}</div>
                    <div className="ud-file-info">{folder.file_count ?? 0} files</div>
                  </div>
                ))}

                {filtered.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={setPreviewFile}
                    onTrash={f => trashFile(f.id)}
                    onRestore={f => restoreFile(f.id)}
                    onDelete={f => deleteFile(f.id)}
                    onStar={f => starFile(f.id)}
                  />
                ))}

                {filtered.length === 0 && (!showFolders || folders.length === 0) && (
                  <div className="ud-empty-state">
                    <i className="fas fa-folder-open" />
                    <h3>No files here</h3>
                    <p>Upload files or create a folder to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Create Class Modal */}
      {showCreateClassModal && (
        <Modal title="Create New Class" onClose={() => setShowCreateClassModal(false)}>
          <ErrorMessage message={createClassError} />
          <FormGroup label="Class Name">
            <input style={inputStyle} value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. Mathematics 101" />
          </FormGroup>
          <FormGroup label="Subject">
            <input style={inputStyle} value={classSubject} onChange={e => setClassSubject(e.target.value)} placeholder="e.g. Mathematics" />
          </FormGroup>
          <FormGroup label="Description">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={classDesc} onChange={e => setClassDesc(e.target.value)} placeholder="Optional description" />
          </FormGroup>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={() => setShowCreateClassModal(false)} style={{ background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={handleCreateClass}
              disabled={!className.trim() || creatingClass}
              style={{ background: className.trim() && !creatingClass ? TEACHER_GRADIENT : '#e2e8f0', color: className.trim() && !creatingClass ? 'white' : '#94a3b8', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 12, fontWeight: 600, cursor: className.trim() && !creatingClass ? 'pointer' : 'not-allowed' }}
            >
              {creatingClass ? 'Creating…' : 'Create Class'}
            </button>
          </div>
        </Modal>
      )}

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      <style>{TD_CSS}</style>
    </div>
  );
}


const TD_CSS = `
/* ── Teacher header ── */
.td-root{min-height:100vh;overflow-x:hidden;width:100%}
.td-header{color:white;padding:1rem 0;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.td-header-inner{max-width:1400px;margin:0 auto;padding:0 2rem;display:flex;justify-content:space-between;align-items:center;gap:0.75rem;overflow:hidden}
.td-header-left{display:flex;align-items:center;gap:0.75rem;flex-shrink:0;min-width:0}
.td-header-right{display:flex;align-items:center;gap:0.75rem;flex-shrink:0}
.td-logo{display:flex;align-items:center;gap:0.6rem;font-size:1.4rem;font-weight:800;white-space:nowrap}
.td-hamburger{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.15);border:none;color:white;padding:0.7rem;border-radius:50%;cursor:pointer;font-size:1.1rem}
@media(min-width:769px){.td-hamburger{display:none}}
.td-toggle-wrap{display:flex;align-items:center;gap:0.6rem;background:rgba(255,255,255,0.15);padding:0.4rem 0.9rem;border-radius:50px}
.td-toggle-label{font-size:0.85rem;font-weight:600;opacity:0.7;white-space:nowrap;color:white}
.td-toggle-label.active{opacity:1}
.td-toggle{position:relative;width:52px;height:26px;background:rgba(255,255,255,0.3);border-radius:50px;cursor:pointer;flex-shrink:0}
.td-toggle-thumb{position:absolute;top:3px;left:3px;width:20px;height:20px;background:white;border-radius:50%;transition:left 0.3s ease;box-shadow:0 2px 6px rgba(0,0,0,0.2)}
.td-toggle-thumb.on{left:29px}
.td-search{position:relative}
.td-search i{position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.7)}
.td-search input{background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.2);border-radius:25px;padding:0.5rem 1rem 0.5rem 2.5rem;color:white;width:260px;outline:none;font-size:0.875rem}
.td-search input::placeholder{color:rgba(255,255,255,0.7)}
.td-logout-btn{background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:white;padding:0.45rem 1.1rem;border-radius:25px;cursor:pointer;font-weight:600;font-size:0.875rem;white-space:nowrap;transition:all 0.2s;display:flex;align-items:center;gap:0.4rem}
.td-logout-btn:hover{background:white;color:#11998e}

/* ── Org content responsive ── */
.td-org-header{padding:1.5rem 2rem 1rem;border-bottom:1px solid #d1fae5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem}
.td-org-header h2{font-size:1.6rem;font-weight:700;color:#1e293b;margin:0}
.td-org-btn{background:linear-gradient(135deg,#11998e,#38ef7d);color:white;border:none;padding:0.7rem 1.4rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;white-space:nowrap}
.td-class-grid{padding:1.5rem 2rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;box-sizing:border-box;width:100%}
.td-tabs{display:flex;gap:0.25rem;border-bottom:2px solid #d1fae5;padding:0 2rem;overflow-x:auto}
.td-tab{padding:0.7rem 1.25rem;border:none;background:none;font-weight:600;cursor:pointer;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap;font-size:0.875rem;display:flex;align-items:center;gap:0.4rem}
.td-tab.active{color:#11998e;border-bottom-color:#11998e}
.td-tab-content{padding:1.5rem 2rem}
.td-tab-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem}
.td-detail-header{display:flex;align-items:center;gap:1rem;padding:1.5rem 2rem 1rem;flex-wrap:wrap}
.td-detail-title{font-size:1.4rem;font-weight:700;color:#1e293b;margin:0}
.td-back-btn{background:rgba(100,116,139,0.1);color:#64748b;border:none;padding:0.6rem 1.25rem;border-radius:12px;font-weight:600;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:0.4rem}
.td-notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1.25rem}
.td-assign-list{display:flex;flex-direction:column;gap:0.75rem}
.td-assign-row{background:#f8fafc;border:2px solid #d1fae5;border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;transition:border-color 0.2s}
.td-assign-row:hover{border-color:#11998e}
.td-marks-badge{background:#d1fae5;color:#065f46;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.8rem;font-weight:700;white-space:nowrap;flex-shrink:0}
.td-student-row{display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;border-radius:10px;margin-bottom:0.5rem;background:#f8fafc;border:1px solid #d1fae5}
.td-empty{text-align:center;padding:3rem 2rem;color:#64748b}
.td-empty i{font-size:3rem;color:#a7f3d0;display:block;margin-bottom:1rem}

/* ── Mobile drawer ── */
.td-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;opacity:0;transition:opacity 0.3s}
.td-overlay.open{display:block;opacity:1}
.td-drawer{position:fixed;top:0;left:0;width:290px;height:100vh;background:white;z-index:201;overflow-y:auto;padding:1.5rem;transform:translateX(-100%);transition:transform 0.3s ease;visibility:hidden}
.td-drawer.open{transform:translateX(0);visibility:visible;box-shadow:4px 0 20px rgba(0,0,0,0.15)}
.td-drawer-close{position:absolute;top:1rem;right:1rem;background:rgba(0,0,0,0.08);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;font-size:1rem}
.td-drawer-logout{width:100%;margin-top:1.5rem;background:linear-gradient(135deg,#11998e,#38ef7d);color:white;border:none;padding:0.75rem;border-radius:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;font-size:0.9rem}

/* ── Responsive ── */
@media(max-width:1024px){
  .td-class-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
}
@media(max-width:768px){
  .td-toggle-wrap{padding:0.35rem 0.7rem;gap:0.4rem}
  .td-toggle-label{font-size:0.75rem}
  .td-search{display:none}
  .td-logout-text{display:none}
  .td-logout-btn{padding:0.55rem 0.7rem;border-radius:50%}
  .td-header-inner{padding:0 1rem}
  .td-logo{font-size:1.2rem}
  .td-header-right{gap:0.5rem}
  .td-org-header{padding:1rem}
  .td-org-header h2{font-size:1.25rem}
  .td-class-grid{grid-template-columns:1fr;padding:1rem}
  .td-tab-content{padding:1rem}
  .td-tabs{padding:0 1rem}
  .td-detail-header{padding:1rem}
  .td-detail-title{font-size:1.2rem}
  .td-notes-grid{grid-template-columns:repeat(2,1fr)}
  .td-assign-row{flex-wrap:wrap}
  /* Hide desktop sidebar on mobile — drawer takes over */
  .td-desktop-sidebar{display:none!important}
  /* Force single column layout */
  .td-root .ud-main-container{grid-template-columns:1fr!important;padding:1rem!important}
}
@media(max-width:480px){
  .td-notes-grid{grid-template-columns:1fr}
  .td-assign-row .td-marks-badge{margin-left:auto}
  .td-toggle-label{display:none}
}`;
