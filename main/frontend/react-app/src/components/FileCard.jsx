// Feature: html-to-react-migration
// Requirement 15.3 — shared FileCard component

import { useState, useRef, useEffect } from 'react';

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
  if (ext === 'pdf') return 'fas fa-file-pdf';
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
  // Ensure the string is parsed as UTC (append Z if no timezone info)
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

export default function FileCard({ file, onPreview, onTrash, onRestore, onDelete, onStar }) {
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
    <div className="ud-file-card" onClick={() => onPreview && onPreview(file)}>
      {file.starred && !file.trashed && <div className="ud-star-badge"><i className="fas fa-star" /></div>}
      {file.trashed && <div className="ud-trash-badge">Trashed</div>}

      <div ref={ref} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
        <button className={`ud-file-menu${open ? ' active' : ''}`}
          aria-label="File options"
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
          <i className="fas fa-ellipsis-v" />
        </button>
        {open && (
          <div className="ud-dropdown" onClick={e => e.stopPropagation()}>
            <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onPreview && onPreview(file); setOpen(false); }}>
              <i className="fas fa-eye" /> Preview
            </div>
            {(file.public_url || file.publicUrl) && (
              <a className="ud-dropdown-item" href={file.public_url || file.publicUrl} download={name}
                onClick={e => e.stopPropagation()}>
                <i className="fas fa-download" /> Download
              </a>
            )}
            <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onStar && onStar(file); setOpen(false); }}>
              <i className={file.starred ? 'fas fa-star' : 'far fa-star'} /> {file.starred ? 'Unstar' : 'Star'}
            </div>
            <div className="ud-dropdown-divider" />
            {file.trashed ? (
              <>
                <div className="ud-dropdown-item" onClick={e => { e.stopPropagation(); onRestore && onRestore(file); setOpen(false); }}>
                  <i className="fas fa-trash-restore" /> Restore
                </div>
                <div className="ud-dropdown-item danger" onClick={e => { e.stopPropagation(); onDelete && onDelete(file); setOpen(false); }}>
                  <i className="fas fa-trash-alt" /> Delete Permanently
                </div>
              </>
            ) : (
              <div className="ud-dropdown-item danger" onClick={e => { e.stopPropagation(); onTrash && onTrash(file); setOpen(false); }}>
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
