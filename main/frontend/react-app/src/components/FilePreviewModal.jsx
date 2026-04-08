// Feature: html-to-react-migration
// Requirement 15.4 — shared FilePreviewModal component

const IMAGE_EXTS  = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
const PDF_EXTS    = new Set(['pdf']);
const VIDEO_EXTS  = new Set(['mp4', 'webm', 'ogg']);
const AUDIO_EXTS  = new Set(['mp3', 'wav', 'ogg', 'm4a']);

function getExt(filename) {
  const parts = (filename || '').split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function PreviewContent({ file }) {
  const name = file.filename || file.name || '';
  const ext = getExt(name);
  const url = file.public_url || file.publicUrl || '';

  if (IMAGE_EXTS.has(ext)) {
    return <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, objectFit: 'contain' }} />;
  }
  if (PDF_EXTS.has(ext)) {
    return <iframe src={url} title={name} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 8, background: 'white' }} />;
  }
  if (VIDEO_EXTS.has(ext)) {
    return (
      <video controls style={{ maxWidth: '100%', borderRadius: 8 }}>
        <source src={url} />
      </video>
    );
  }
  if (AUDIO_EXTS.has(ext)) {
    return (
      <audio controls style={{ borderRadius: 8 }}>
        <source src={url} />
      </audio>
    );
  }
  return (
    <div
      data-testid="unsupported-message"
      style={{ textAlign: 'center', color: 'white', padding: '3rem' }}
    >
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
      <h3>Preview not available</h3>
      <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
        This file type cannot be previewed inline.
      </p>
    </div>
  );
}

export default function FilePreviewModal({ file, onClose }) {
  if (!file) return null;
  const name = file.filename || file.name || 'File';
  const url = file.public_url || file.publicUrl || '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${name}`}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:2000,
        display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}
      onClick={onClose}
    >
      {/* Toolbar */}
      <div style={{ width:'100%', maxWidth:1000, display:'flex', justifyContent:'space-between',
        alignItems:'center', padding:'0.75rem 1rem', color:'white' }}
        onClick={e => e.stopPropagation()}>
        <span style={{ fontWeight:600, fontSize:'1rem' }}>{name}</span>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          {url && (
            <a href={url} download={name}
              style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white',
                padding:'0.5rem 1rem', borderRadius:8, cursor:'pointer', fontSize:'0.875rem',
                display:'flex', alignItems:'center', gap:'0.4rem', textDecoration:'none' }}
              onClick={e => e.stopPropagation()}>
              <i className="fas fa-download" /> Download
            </a>
          )}
          <button onClick={onClose}
            style={{ background:'rgba(239,68,68,0.7)', border:'none', color:'white',
              padding:'0.5rem 1rem', borderRadius:8, cursor:'pointer', fontSize:'0.875rem',
              display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <i className="fas fa-times" /> Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ width:'100%', maxWidth:1000, flex:1, display:'flex', alignItems:'center',
        justifyContent:'center', padding:'0 1rem 1rem', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>
        <PreviewContent file={{ ...file, name }} />
      </div>
    </div>
  );
}
