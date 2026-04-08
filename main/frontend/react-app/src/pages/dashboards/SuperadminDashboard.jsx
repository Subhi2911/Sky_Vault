// Feature: html-to-react-migration
// Requirements: 11.1–11.4

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrgs, createOrg } from '../../api/api';

// The platform secret must match PLATFORM_SECRET in the backend.
// It is stored in sessionStorage after the user unlocks the panel.
const PLATFORM_SECRET = 'skyvault-platform-2026';
const SESSION_KEY = 'platformSecret';

// ── Colour tokens ─────────────────────────────────────────────────────────────
const DARK_BG    = '#0f172a';
const CARD_BG    = '#1e293b';
const BORDER     = '#334155';
const INDIGO     = '#818cf8';
const INDIGO_D   = '#6366f1';
const TEXT_MAIN  = '#e2e8f0';
const TEXT_MUTED = '#94a3b8';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      background: CARD_BG, color: TEXT_MAIN,
      padding: '0.875rem 1.5rem', borderRadius: 12,
      fontSize: '0.875rem', fontWeight: 500,
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.5rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      borderLeft: `4px solid ${type === 'success' ? '#22c55e' : '#ef4444'}`,
    }}>
      {message}
    </div>
  );
}

// ── Lock Screen ───────────────────────────────────────────────────────────────
function LockScreen({ onUnlock }) {
  const [secret, setSecret] = useState('');
  const [error, setError]   = useState('');

  function handleUnlock() {
    if (secret === PLATFORM_SECRET) {
      sessionStorage.setItem(SESSION_KEY, secret);
      onUnlock(secret);
    } else {
      setError('Incorrect secret key.');
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - 60px)', background: DARK_BG,
    }}>
      <div style={{
        background: CARD_BG, border: `1px solid ${BORDER}`,
        borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 380,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT_MAIN, marginBottom: '0.5rem' }}>
          Platform Admin Access
        </h2>
        <p style={{ color: TEXT_MUTED, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          This panel is restricted to Sky Vault platform administrators only.
        </p>
        <input
          type="password"
          value={secret}
          onChange={e => { setSecret(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="Enter secret key"
          style={{
            width: '100%', padding: '0.75rem 1rem',
            background: DARK_BG, border: `1px solid ${error ? '#ef4444' : BORDER}`,
            borderRadius: 10, color: TEXT_MAIN, fontSize: '1rem',
            outline: 'none', textAlign: 'center', letterSpacing: '0.2rem',
            marginBottom: '1rem', boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</div>
        )}
        <button
          onClick={handleUnlock}
          style={{
            width: '100%', padding: '0.75rem',
            background: INDIGO_D, color: 'white', border: 'none',
            borderRadius: 10, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          🔓 Unlock
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SuperadminDashboard() {
  const navigate = useNavigate();

  // Check session for stored secret (persists across re-renders but not page refresh)
  const [secret, setSecret]   = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === PLATFORM_SECRET);

  const [orgs, setOrgs]         = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const [orgName, setOrgName]         = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [creating, setCreating]       = useState(false);
  const [newOrg, setNewOrg]           = useState(null); // result after creation

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  // ── Load orgs once unlocked ───────────────────────────────────────────────
  useEffect(() => {
    if (!unlocked) return;
    loadOrgs();
  }, [unlocked]);

  async function loadOrgs() {
    setLoadingOrgs(true);
    const res = await getAllOrgs(PLATFORM_SECRET);
    if (res.success) {
      setOrgs(res.data?.orgs ?? []);
    } else {
      showToast('Failed to load organisations', 'error');
    }
    setLoadingOrgs(false);
  }

  function handleUnlock(s) {
    setSecret(s);
    setUnlocked(true);
  }

  // ── Create org ────────────────────────────────────────────────────────────
  async function handleCreateOrg(e) {
    e.preventDefault();
    if (!orgName.trim()) { showToast('Organisation name is required', 'error'); return; }
    setCreating(true);
    const res = await createOrg(orgName.trim(), contactEmail.trim(), PLATFORM_SECRET);
    if (res.success) {
      setNewOrg(res.data);
      setOrgName('');
      setContactEmail('');
      showToast('Organisation created!', 'success');
      loadOrgs();
    } else {
      showToast(res.data?.error || 'Failed to create organisation', 'error');
    }
    setCreating(false);
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => showToast('Code copied!', 'success'));
  }

  // ── Lock screen gate ──────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: DARK_BG, minHeight: '100vh' }}>
        <Header />
        <LockScreen onUnlock={handleUnlock} />
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: DARK_BG, color: TEXT_MAIN, minHeight: '100vh' }}>
      <Header />

      <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>

        {/* ── Create org form ── */}
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT_MAIN, marginBottom: '1.25rem' }}>
          ➕ Create New Organisation
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '1.75rem', marginBottom: '2rem' }}>
          <form onSubmit={handleCreateOrg}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <FormGroup label="Organisation Name">
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Springfield High School"
                  style={inputStyle}
                />
              </FormGroup>
              <FormGroup label="Contact Email (optional)">
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  style={inputStyle}
                />
              </FormGroup>
            </div>
            <button
              type="submit"
              disabled={creating}
              style={{
                background: creating ? '#4f46e5aa' : INDIGO_D,
                color: 'white', border: 'none',
                padding: '0.7rem 1.5rem', borderRadius: 10,
                fontSize: '0.875rem', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              🏢 {creating ? 'Creating…' : 'Create Organisation'}
            </button>
          </form>

          {/* Result box */}
          {newOrg && (
            <div style={{
              background: DARK_BG, border: '1px solid #22c55e',
              borderRadius: 12, padding: '1.25rem', marginTop: '1rem', textAlign: 'center',
            }}>
              <div style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>
                Organisation created! Share this code with the admin:
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', letterSpacing: '0.3rem', margin: '0.5rem 0' }}>
                {newOrg.code}
              </div>
              <div style={{ color: TEXT_MUTED, fontSize: '0.8rem', marginBottom: '0.5rem' }}>{newOrg.name}</div>
              <button
                onClick={() => copyCode(newOrg.code)}
                style={{
                  background: '#dcfce7', color: '#15803d', border: 'none',
                  padding: '0.4rem 0.9rem', borderRadius: 8,
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                📋 Copy Code
              </button>
            </div>
          )}
        </div>

        {/* ── Orgs table ── */}
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT_MAIN, marginBottom: '1.25rem' }}>
          📋 All Organisations
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Join Code', 'Contact Email', 'Status', 'Created'].map(h => (
                    <th key={h} style={{
                      background: DARK_BG, padding: '0.75rem 1.25rem',
                      textAlign: 'left', fontSize: '0.7rem', fontWeight: 700,
                      color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: `1px solid ${BORDER}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingOrgs ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: TEXT_MUTED }}>
                      ⏳ Loading…
                    </td>
                  </tr>
                ) : orgs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: TEXT_MUTED }}>
                      🏢 No organisations yet
                    </td>
                  </tr>
                ) : orgs.map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={tdStyle}><strong>{o.name}</strong></td>
                    <td style={tdStyle}>
                      <span
                        onClick={() => copyCode(o.code)}
                        title="Click to copy"
                        style={{
                          background: DARK_BG, border: `1px solid ${BORDER}`,
                          padding: '0.2rem 0.6rem', borderRadius: 6,
                          fontFamily: 'monospace', fontSize: '0.85rem',
                          color: '#a5b4fc', cursor: 'pointer',
                        }}
                      >
                        {o.code}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_MUTED }}>{o.contact_email || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: o.status === 'pending' ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)',
                        color: o.status === 'pending' ? '#fde68a' : '#86efac',
                        padding: '0.2rem 0.6rem', borderRadius: 20,
                        fontSize: '0.72rem', fontWeight: 600,
                      }}>
                        {o.status || 'active'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_MUTED }}>{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Header() {
  const navigate = useNavigate();
  function handleLock() {
    sessionStorage.removeItem(SESSION_KEY);
    navigate('/');
  }
  return (
    <header style={{
      background: CARD_BG, padding: '1rem 2rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>
        <span style={{ color: INDIGO }}>☁</span> Sky Vault
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{
          background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
          color: '#fca5a5', padding: '0.3rem 0.8rem', borderRadius: 20,
          fontSize: '0.75rem', fontWeight: 700,
        }}>
          🛡 Platform Admin
        </span>
        <button
          onClick={handleLock}
          style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5', padding: '0.4rem 1rem', borderRadius: 8,
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          🔒 Lock &amp; Exit
        </button>
      </div>
    </header>
  );
}

function FormGroup({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.75rem', fontWeight: 700,
        color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '0.4rem',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.65rem 1rem',
  background: DARK_BG, border: `1px solid ${BORDER}`,
  borderRadius: 10, color: TEXT_MAIN, fontSize: '0.875rem',
  outline: 'none', boxSizing: 'border-box',
};

const tdStyle = {
  padding: '0.75rem 1.25rem',
  fontSize: '0.875rem',
  color: TEXT_MAIN,
  verticalAlign: 'middle',
};
