// Feature: html-to-react-migration
// Requirement 15.5 — circular storage progress indicator

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 213.628

function getStrokeColor(pct) {
  if (pct > 80) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#667eea';
}

export { CIRCUMFERENCE };

export default function StorageWidget({ usedBytes, totalBytes }) {
  const pct = totalBytes > 0 ? Math.min((usedBytes / totalBytes) * 100, 100) : 0;
  const strokeDashoffset = totalBytes > 0 ? CIRCUMFERENCE * (1 - usedBytes / totalBytes) : CIRCUMFERENCE;
  const stroke = getStrokeColor(pct);

  function fmt(bytes) {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        borderRadius: '12px',
        padding: '1.25rem',
        textAlign: 'center',
      }}
    >
      <div style={{ width: 80, height: 80, margin: '0 auto 1rem' }}>
        <svg width="80" height="80" viewBox="0 0 80 80" aria-label="Storage usage">
          <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            data-testid="storage-arc"
          />
        </svg>
      </div>
      <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
        Storage Used
      </div>
      <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
        {fmt(usedBytes)} of {fmt(totalBytes)}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{pct.toFixed(1)}%</div>
    </div>
  );
}
