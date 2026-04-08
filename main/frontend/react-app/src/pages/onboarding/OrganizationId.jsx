// Feature: html-to-react-migration
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrgByCode } from '../../api/api';

const pageStyle = {
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  position: 'relative',
  overflow: 'hidden',
};

const containerStyle = {
  maxWidth: '500px',
  width: '100%',
  position: 'relative',
  zIndex: 1,
};

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.98)',
  backdropFilter: 'blur(10px)',
  borderRadius: '25px',
  padding: '3rem 2.5rem',
  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '2.5rem',
};

const headerIconStyle = {
  width: '80px',
  height: '80px',
  margin: '0 auto 1.5rem',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  color: 'white',
  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
};

const h1Style = {
  fontSize: '2rem',
  marginBottom: '0.5rem',
  color: '#1f2937',
  fontWeight: 800,
};

const subtitleStyle = {
  color: '#6b7280',
  fontSize: '1rem',
};

const inputGroupStyle = {
  marginBottom: '1.5rem',
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  color: '#374151',
  fontWeight: 600,
  fontSize: '0.95rem',
};

const inputWrapStyle = {
  position: 'relative',
};

const inputIconStyle = {
  position: 'absolute',
  left: '15px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
  fontSize: '1.1rem',
  pointerEvents: 'none',
};

const inputStyle = {
  width: '100%',
  padding: '14px 15px 14px 45px',
  border: '2px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.3s ease',
};

const btnBase = {
  width: '100%',
  padding: '14px',
  border: 'none',
  borderRadius: '12px',
  fontSize: '1.05rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  marginTop: '0.5rem',
};

const primaryBtnStyle = {
  ...btnBase,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  boxShadow: '0 5px 20px rgba(102, 126, 234, 0.4)',
};

const secondaryBtnStyle = {
  ...btnBase,
  background: '#f3f4f6',
  color: '#374151',
};

const errorStyle = {
  marginTop: '1rem',
  padding: '12px',
  background: '#fee2e2',
  borderLeft: '4px solid #ef4444',
  borderRadius: '8px',
  color: '#991b1b',
  fontSize: '0.9rem',
};

const confirmBoxStyle = {
  marginTop: '1rem',
  padding: '16px',
  background: '#d1fae5',
  borderLeft: '4px solid #10b981',
  borderRadius: '8px',
  color: '#065f46',
  fontSize: '0.95rem',
  marginBottom: '1rem',
};

export default function OrganizationId() {
  const navigate = useNavigate();
  const [orgCode, setOrgCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // confirm step state
  const [confirmedOrg, setConfirmedOrg] = useState(null); // { name, code }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const code = orgCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    try {
      const result = await getOrgByCode(code);
      if (result.success && result.data && (result.data.name || result.data.id)) {
        setConfirmedOrg({ name: result.data.name, code, email_domain: result.data.email_domain || '' });
      } else {
        setError('Invalid Organization ID. Please try again.');
      }
    } catch {
      setError('Invalid Organization ID. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    navigate('/organization-role', {
      state: { orgCode: confirmedOrg.code, orgName: confirmedOrg.name, orgEmailDomain: confirmedOrg.email_domain || '' },
    });
  }

  function handleBack() {
    if (confirmedOrg) {
      setConfirmedOrg(null);
    } else {
      navigate(-1);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <div style={headerIconStyle}>
              <span>🏢</span>
            </div>
            <h1 style={h1Style}>Enter Organization ID</h1>
            <p style={subtitleStyle}>Please enter your unique organization identifier</p>
          </div>

          {!confirmedOrg ? (
            <form onSubmit={handleSubmit}>
              <div style={inputGroupStyle}>
                <label style={labelStyle} htmlFor="org-code">Organization ID</label>
                <div style={inputWrapStyle}>
                  <span style={inputIconStyle}>🪪</span>
                  <input
                    id="org-code"
                    style={inputStyle}
                    type="text"
                    placeholder="e.g., ORG-12345"
                    value={orgCode}
                    onChange={e => setOrgCode(e.target.value)}
                    required
                    data-testid="org-code-input"
                  />
                </div>
              </div>

              {error && (
                <div style={errorStyle} data-testid="error-message">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                style={primaryBtnStyle}
                disabled={loading}
                data-testid="submit-button"
              >
                {loading ? 'Checking…' : '→ Continue'}
              </button>

              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={handleBack}
                data-testid="back-button"
              >
                ← Back
              </button>
            </form>
          ) : (
            <div data-testid="confirm-step">
              <div style={confirmBoxStyle}>
                <strong>Organisation found:</strong>
                <div style={{ marginTop: '6px', fontSize: '1.1rem', fontWeight: 700 }} data-testid="org-name-display">
                  {confirmedOrg.name}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.85rem', opacity: 0.8 }}>
                  Code: {confirmedOrg.code}
                </div>
                {confirmedOrg.email_domain && (
                  <div style={{ marginTop: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.3)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>
                    📧 Required email domain: <strong>@{confirmedOrg.email_domain}</strong>
                  </div>
                )}
              </div>
              <p style={{ color: '#374151', marginBottom: '1rem', fontSize: '0.95rem' }}>
                Is this the correct organisation?
              </p>
              <button
                style={primaryBtnStyle}
                onClick={handleConfirm}
                data-testid="confirm-button"
              >
                ✓ Yes, Continue
              </button>
              <button
                style={secondaryBtnStyle}
                onClick={handleBack}
                data-testid="back-button"
              >
                ← Try a different code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
