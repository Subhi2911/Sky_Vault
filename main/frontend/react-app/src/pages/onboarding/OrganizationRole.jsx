// Feature: html-to-react-migration
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
  maxWidth: '1200px',
  width: '100%',
  position: 'relative',
  zIndex: 1,
};

const headerStyle = {
  textAlign: 'center',
  color: 'white',
  marginBottom: '4rem',
};

const h1Style = {
  fontSize: '3rem',
  marginBottom: '1rem',
  fontWeight: 900,
  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
  letterSpacing: '1px',
};

const orgNameStyle = {
  fontSize: '1.5rem',
  marginBottom: '0.5rem',
  fontWeight: 600,
  opacity: 0.95,
  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
};

const subtitleStyle = {
  fontSize: '1.1rem',
  opacity: 0.9,
};

const cardsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '2.5rem',
};

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.98)',
  backdropFilter: 'blur(10px)',
  borderRadius: '25px',
  padding: '3.5rem 2rem',
  textAlign: 'center',
  cursor: 'pointer',
  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease',
  position: 'relative',
  overflow: 'hidden',
};

const roleIconBase = {
  width: '100px',
  height: '100px',
  margin: '0 auto 2rem',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  color: 'white',
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
};

const roleIconStyles = {
  student: { ...roleIconBase, background: 'linear-gradient(135deg, #2AF598, #009EFD)' },
  teacher: { ...roleIconBase, background: 'linear-gradient(135deg, #FF9A8B, #FF6A88)' },
  admin:   { ...roleIconBase, background: 'linear-gradient(135deg, #667eea, #764ba2)' },
};

const cardTitleStyle = {
  fontSize: '2rem',
  marginBottom: '1rem',
  color: '#1f2937',
  fontWeight: 800,
};

const cardDescStyle = {
  color: '#6b7280',
  marginBottom: '2rem',
  lineHeight: 1.8,
  fontSize: '1.05rem',
};

const roleBtnStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  padding: '14px 35px',
  borderRadius: '50px',
  fontSize: '1.05rem',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 5px 20px rgba(102, 126, 234, 0.4)',
  letterSpacing: '0.5px',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const ROLE_CONFIG = [
  {
    role: 'student',
    label: 'Student',
    icon: '🎓',
    description: 'Access shared learning materials and manage your personal student storage.',
    path: '/student-auth',
  },
  {
    role: 'teacher',
    label: 'Teacher',
    icon: '📋',
    description: 'Manage curriculum, upload resources, and oversee student vault access.',
    path: '/teacher-auth',
  },
  {
    role: 'admin',
    label: 'Admin',
    icon: '🛡️',
    description: 'Manage organisation settings, users, and control access permissions.',
    path: '/admin-auth',
  },
];

export default function OrganizationRole() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgCode, orgName } = location.state || {};
  const [hoveredRole, setHoveredRole] = useState(null);

  function handleRoleSelect(roleConfig) {
    navigate(roleConfig.path, {
      state: { orgCode, orgName, orgEmailDomain: location.state?.orgEmailDomain || '', role: roleConfig.role },
    });
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={h1Style}>☁️ SKY VAULT</h1>
          {orgName && (
            <div style={orgNameStyle} data-testid="org-name-header">
              {orgName}
            </div>
          )}
          <p style={subtitleStyle}>Access your organisation's vault based on your permissions</p>
        </div>

        <div style={cardsGridStyle}>
          {ROLE_CONFIG.map((rc) => {
            const isHovered = hoveredRole === rc.role;
            return (
              <div
                key={rc.role}
                style={{
                  ...cardStyle,
                  transform: isHovered ? 'translateY(-15px) scale(1.02)' : 'translateY(0) scale(1)',
                  boxShadow: isHovered
                    ? '0 25px 60px rgba(0,0,0,0.3)'
                    : '0 15px 40px rgba(0,0,0,0.2)',
                }}
                onClick={() => handleRoleSelect(rc)}
                onMouseEnter={() => setHoveredRole(rc.role)}
                onMouseLeave={() => setHoveredRole(null)}
                data-testid={`role-card-${rc.role}`}
              >
                <div style={{
                  ...roleIconStyles[rc.role],
                  transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
                  transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                  boxShadow: isHovered ? '0 15px 40px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.15)',
                }}>
                  <span>{rc.icon}</span>
                </div>
                <h2 style={cardTitleStyle}>{rc.label}</h2>
                <p style={cardDescStyle}>{rc.description}</p>
                <button
                  style={{
                    ...roleBtnStyle,
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isHovered
                      ? '0 8px 30px rgba(102,126,234,0.6)'
                      : '0 5px 20px rgba(102,126,234,0.4)',
                  }}
                  onClick={e => { e.stopPropagation(); handleRoleSelect(rc); }}
                  data-testid={`role-btn-${rc.role}`}
                >
                  Continue as {rc.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
