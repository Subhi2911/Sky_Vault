// Feature: html-to-react-migration
// Requirement 15.1 — shared Navbar component

export default function Navbar({
  userName,
  onNotificationClick,
  onProfileClick,
  onLogout,
  searchQuery,
  onSearchChange,
  unreadCount = 0,
}) {
  return (
    <header
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 0',
        boxShadow: '0 4px 20px rgba(102,126,234,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', fontWeight: 800 }}>
          <span>☁</span>
          <span>Sky Vault</span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.7)' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 25,
                padding: '0.5rem 1rem 0.5rem 2.5rem',
                color: 'white',
                width: 300,
              }}
            />
          </div>

          {/* Notification bell */}
          <button
            onClick={onNotificationClick}
            aria-label="Notifications"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '50%',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                data-testid="unread-badge"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <button
            onClick={onProfileClick}
            aria-label="Profile"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          >
            👤
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '0.5rem 1.25rem',
              borderRadius: 25,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
