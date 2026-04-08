// Feature: html-to-react-migration
// Requirements: 10.1–10.5

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOrgStats, getOrgMembers, getOrgClasses, removeOrgMember, changeOrgMemberRole, getUserProfile, getOrgInfo } from '../../api/api';
import Spinner from '../../components/Spinner';

// ── Colour tokens ─────────────────────────────────────────────────────────────
const DARK_BG   = '#0f172a';
const SIDEBAR_BG = '#1e293b';
const CARD_BG   = '#1e293b';
const BORDER    = '#334155';
const INDIGO    = '#818cf8';
const INDIGO_D  = '#6366f1';
const TEXT_MAIN = '#e2e8f0';
const TEXT_MUTED = '#94a3b8';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function roleBadge(role) {
  const styles = {
    admin:   { background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' },
    teacher: { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)' },
    student: { background: 'rgba(34,197,94,0.2)',  color: '#86efac', border: '1px solid rgba(34,197,94,0.4)' },
    user:    { background: 'rgba(100,116,139,0.2)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.4)' },
  };
  const s = styles[role] || styles.user;
  return (
    <span style={{ ...s, padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, display: 'inline-block' }}>
      {role}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, visible }) {
  if (!visible) return null;
  const borderColor = type === 'success' ? '#22c55e' : '#ef4444';
  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      background: '#1e293b', color: TEXT_MAIN,
      padding: '0.875rem 1.5rem', borderRadius: 12,
      fontSize: '0.875rem', fontWeight: 500,
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.5rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      borderLeft: `4px solid ${borderColor}`,
    }}>
      {message}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, iconBg, icon }) {
  return (
    <div style={{
      background: CARD_BG, borderRadius: 16, padding: '1.25rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: '1rem',
      border: `1px solid ${BORDER}`,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: iconBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: TEXT_MAIN, lineHeight: 1 }}>
          {value ?? '-'}
        </div>
        <div style={{ fontSize: '0.75rem', color: TEXT_MUTED, marginTop: '0.2rem' }}>{label}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [orgId,   setOrgId]   = useState(null);
  const [orgCode, setOrgCode] = useState('');
  const [orgName, setOrgName] = useState('Organisation');

  const [stats,   setStats]   = useState(null);
  const [members, setMembers] = useState([]);
  const [classes, setClasses] = useState([]);

  const [memberSearch, setMemberSearch] = useState('');

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  // ── Auth guard + initial load ───────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/admin-auth'); return; }

    async function init() {
      setLoading(true);

      // Always fetch user profile to get org_id and org_code
      const profileRes = await getUserProfile(user.uid);

      let id   = localStorage.getItem('orgId');
      let code = localStorage.getItem('orgCode') || '';
      let name = localStorage.getItem('orgName') || 'Organisation';

      if (profileRes.success && profileRes.data?.org_id) {
        id = String(profileRes.data.org_id);
        localStorage.setItem('orgId', id);
      }

      // If we have org_id, fetch org details to get the code and name
      if (id) {
        const orgRes = await getOrgInfo(id);
        if (orgRes.success) {
          code = orgRes.data?.code || code;
          name = orgRes.data?.name || name;
          localStorage.setItem('orgCode', code);
          localStorage.setItem('orgName', name);
        }
      }

      if (!id) {
        setLoading(false);
        return;
      }

      setOrgId(id);
      setOrgCode(code);
      setOrgName(name);

      const [statsRes, membersRes, classesRes] = await Promise.all([
        getOrgStats(id),
        getOrgMembers(id),
        getOrgClasses(id),
      ]);
      if (statsRes.success)   setStats(statsRes.data);
      if (membersRes.success) setMembers(membersRes.data?.members ?? []);
      if (classesRes.success) setClasses(classesRes.data?.classes ?? []);
      setLoading(false);
    }

    init();
  }, [authLoading, user, navigate]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleRemoveMember(userId, name) {
    if (!window.confirm(`Remove "${name}"?`)) return;
    const res = await removeOrgMember(userId);
    if (res.success) {
      showToast('Member removed', 'success');
      const [statsRes, membersRes] = await Promise.all([getOrgStats(orgId), getOrgMembers(orgId)]);
      if (statsRes.success)   setStats(statsRes.data);
      if (membersRes.success) setMembers(membersRes.data?.members ?? []);
    } else {
      showToast('Failed to remove member', 'error');
    }
  }

  async function handleChangeRole(userId, newRole, name) {
    if (!window.confirm(`Make "${name}" a ${newRole}?`)) return;
    const res = await changeOrgMemberRole(userId, newRole);
    if (res.success) {
      showToast(`${name} is now a ${newRole}`, 'success');
      const [statsRes, membersRes] = await Promise.all([getOrgStats(orgId), getOrgMembers(orgId)]);
      if (statsRes.success)   setStats(statsRes.data);
      if (membersRes.success) setMembers(membersRes.data?.members ?? []);
    } else {
      showToast('Failed to change role', 'error');
    }
  }

  function copyCode() {
    if (!orgCode) return;
    navigator.clipboard.writeText(orgCode).then(() => showToast('Join code copied!', 'success'));
  }

  async function handleLogout() {
    if (!window.confirm('Logout?')) return;
    await signOut();
    localStorage.clear();
    navigate('/');
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const recentMembers = [...members]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  const filteredMembers = memberSearch.trim()
    ? members.filter(m =>
        (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(memberSearch.toLowerCase())
      )
    : members;

  // ── Loading state ────────────────────────────────────────────────────────────
  if (authLoading || loading) return <Spinner />;

  // ── No org linked ─────────────────────────────────────────────────────────
  if (!orgId) return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: DARK_BG, color: TEXT_MAIN, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '3rem', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
        <h2 style={{ color: TEXT_MAIN, marginBottom: '1rem' }}>No Organisation Linked</h2>
        <p style={{ color: TEXT_MUTED, marginBottom: '2rem', lineHeight: 1.6 }}>
          Your account is not linked to any organisation. Please sign up again using a valid organisation code provided by Sky Vault.
        </p>
        <button
          onClick={async () => { await signOut(); localStorage.clear(); navigate('/'); }}
          style={{ background: `linear-gradient(135deg,${INDIGO_D},#8b5cf6)`, color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: DARK_BG, color: TEXT_MAIN, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        padding: '1rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 800, color: TEXT_MAIN }}>
          <span style={{ color: INDIGO }}>☁</span>
          <span>Sky Vault</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Org name badge */}
          <span style={{
            background: 'rgba(129,140,248,0.2)', border: '1px solid rgba(129,140,248,0.4)',
            color: '#a5b4fc', padding: '0.35rem 0.9rem', borderRadius: 20,
            fontSize: '0.8rem', fontWeight: 600,
          }}>
            🏢 {orgName}
          </span>
          {/* Join code badge */}
          <span
            onClick={copyCode}
            title="Click to copy join code"
            style={{
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#86efac', padding: '0.35rem 0.9rem', borderRadius: 20,
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            🔑 {orgCode || '-'}
          </span>
          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', padding: '0.35rem 0.9rem', borderRadius: 20,
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            }}
          >
            ↩ Logout
          </button>
        </div>
      </header>

      {/* ── Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 64px)' }}>

        {/* ── Sidebar ── */}
        <aside style={{ background: SIDEBAR_BG, padding: '1.5rem 0', borderRight: `1px solid ${BORDER}` }}>
          <SidebarLabel>Overview</SidebarLabel>
          <NavItem active={activeSection === 'overview'} onClick={() => setActiveSection('overview')}>
            📊 Dashboard
          </NavItem>
          <SidebarLabel>Organisation</SidebarLabel>
          <NavItem active={activeSection === 'members'} onClick={() => setActiveSection('members')}>
            👥 Members
          </NavItem>
          <NavItem active={activeSection === 'classes'} onClick={() => setActiveSection('classes')}>
            🏫 Classes
          </NavItem>
          <SidebarLabel>Account</SidebarLabel>
          <NavItem active={activeSection === 'settings'} onClick={() => setActiveSection('settings')}>
            ⚙ Settings
          </NavItem>
        </aside>

        {/* ── Main content ── */}
        <main style={{ padding: '2rem', overflowY: 'auto', background: DARK_BG }}>

          {/* ── Overview ── */}
          {activeSection === 'overview' && (
            <div>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <StatCard label="Total Members" value={stats?.total_members} iconBg="rgba(139,92,246,0.2)" icon="👥" />
                <StatCard label="Teachers"      value={stats?.teachers}      iconBg="rgba(59,130,246,0.2)"  icon="👨‍🏫" />
                <StatCard label="Students"      value={stats?.students}      iconBg="rgba(34,197,94,0.2)"   icon="🎓" />
                <StatCard label="Classes"       value={stats?.classes}       iconBg="rgba(234,88,12,0.2)"   icon="🏫" />
              </div>

              {/* Recent members */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT_MAIN }}>Recent Members</span>
                <button
                  onClick={() => setActiveSection('members')}
                  style={{ background: INDIGO_D, color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: 10, fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  View All →
                </button>
              </div>
              <TableCard>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Email', 'Role', 'Joined'].map(h => <Th key={h}>{h}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {recentMembers.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: TEXT_MUTED }}>No members yet</td></tr>
                    ) : recentMembers.map(m => (
                      <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <Td><strong>{m.name || '-'}</strong></Td>
                        <Td style={{ color: TEXT_MUTED }}>{m.email}</Td>
                        <Td>{roleBadge(m.role)}</Td>
                        <Td style={{ color: TEXT_MUTED }}>{fmtDate(m.created_at)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          )}

          {/* ── Members ── */}
          {activeSection === 'members' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT_MAIN }}>All Members</span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: '#1e293b', border: `1px solid ${BORDER}`, borderRadius: 10,
                  padding: '0.45rem 0.9rem', width: 240,
                }}>
                  <span style={{ color: TEXT_MUTED }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search name or email…"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: TEXT_MAIN, width: '100%' }}
                  />
                </div>
              </div>
              <TableCard>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Email', 'Role', 'Student ID', 'Joined', 'Actions'].map(h => <Th key={h}>{h}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: TEXT_MUTED }}>No members found</td></tr>
                    ) : filteredMembers.map(m => (
                      <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <Td><strong>{m.name || '-'}</strong></Td>
                        <Td style={{ color: TEXT_MUTED }}>{m.email}</Td>
                        <Td>{roleBadge(m.role)}</Td>
                        <Td>
                          {m.student_id
                            ? <code style={{ background: '#0f172a', padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.8rem', color: TEXT_MUTED }}>{m.student_id}</code>
                            : '-'}
                        </Td>
                        <Td style={{ color: TEXT_MUTED }}>{fmtDate(m.created_at)}</Td>
                        <Td>
                          {m.role === 'admin' ? (
                            <span style={{ color: TEXT_MUTED, fontSize: '0.8rem' }}>You</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {m.role !== 'teacher' && (
                                <ActionBtn
                                  color="#93c5fd" bg="rgba(59,130,246,0.15)" border="rgba(59,130,246,0.3)"
                                  onClick={() => handleChangeRole(m.id, 'teacher', m.name || m.email)}
                                >
                                  👨‍🏫 Teacher
                                </ActionBtn>
                              )}
                              {m.role !== 'student' && (
                                <ActionBtn
                                  color="#86efac" bg="rgba(34,197,94,0.15)" border="rgba(34,197,94,0.3)"
                                  onClick={() => handleChangeRole(m.id, 'student', m.name || m.email)}
                                >
                                  🎓 Student
                                </ActionBtn>
                              )}
                              <ActionBtn
                                color="#fca5a5" bg="rgba(239,68,68,0.15)" border="rgba(239,68,68,0.3)"
                                onClick={() => handleRemoveMember(m.id, m.name || m.email)}
                              >
                                ✕ Remove
                              </ActionBtn>
                            </div>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          )}

          {/* ── Classes ── */}
          {activeSection === 'classes' && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT_MAIN }}>Classes</span>
              </div>
              <TableCard>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Class Name', 'Subject', 'Teacher', 'Created'].map(h => <Th key={h}>{h}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: TEXT_MUTED }}>No classes yet</td></tr>
                    ) : classes.map(c => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <Td><strong>{c.name}</strong></Td>
                        <Td style={{ color: TEXT_MUTED }}>{c.subject || '-'}</Td>
                        <Td>{c.teacher_name || '-'}</Td>
                        <Td style={{ color: TEXT_MUTED }}>{fmtDate(c.created_at)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          )}

          {/* ── Settings ── */}
          {activeSection === 'settings' && (
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT_MAIN, marginBottom: '1.25rem' }}>
                Organisation Settings
              </div>
              <div style={{
                background: CARD_BG, borderRadius: 16, padding: '2rem',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)', maxWidth: 500,
                border: `1px solid ${BORDER}`,
              }}>
                <SettingsRow label="Organisation Name">
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: TEXT_MAIN }}>{orgName}</span>
                </SettingsRow>

                <SettingsRow label="Join Code">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: INDIGO_D, letterSpacing: '0.25rem' }}>
                      {orgCode || '-'}
                    </span>
                    <button
                      onClick={copyCode}
                      style={{ background: INDIGO_D, color: 'white', border: 'none', padding: '0.3rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: TEXT_MUTED, marginTop: '0.4rem' }}>
                    Share this code with teachers and students to join your organisation.
                  </div>
                </SettingsRow>

                <SettingsRow label="Admin Email">
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: TEXT_MAIN }}>{user?.email || '-'}</span>
                </SettingsRow>
              </div>
            </div>
          )}

        </main>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}

// ── Small layout helpers ──────────────────────────────────────────────────────

function SidebarLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.68rem', fontWeight: 700, color: '#475569',
      textTransform: 'uppercase', letterSpacing: 1,
      padding: '0 1.25rem', margin: '1.25rem 0 0.4rem',
    }}>
      {children}
    </div>
  );
}

function NavItem({ active, onClick, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.7rem',
        padding: '0.7rem 1.25rem', cursor: 'pointer',
        fontSize: '0.875rem', fontWeight: 500,
        color: active ? '#a5b4fc' : TEXT_MUTED,
        background: active ? 'rgba(129,140,248,0.15)' : 'transparent',
        borderLeft: active ? `3px solid ${INDIGO}` : '3px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </div>
  );
}

function TableCard({ children }) {
  return (
    <div style={{ background: CARD_BG, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.3)', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
      <div style={{ overflowX: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{
      background: '#0f172a', padding: '0.8rem 1.25rem',
      textAlign: 'left', fontSize: '0.72rem', fontWeight: 700,
      color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      {children}
    </th>
  );
}

function Td({ children, style }) {
  return (
    <td style={{ padding: '0.8rem 1.25rem', fontSize: '0.875rem', color: TEXT_MAIN, verticalAlign: 'middle', ...style }}>
      {children}
    </td>
  );
}

function ActionBtn({ children, onClick, color, bg, border }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, border: `1px solid ${border}`, color,
        padding: '0.3rem 0.7rem', borderRadius: 8,
        fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      }}
    >
      {children}
    </button>
  );
}

function SettingsRow({ label, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
        {label}
      </div>
      {children}
    </div>
  );
}
