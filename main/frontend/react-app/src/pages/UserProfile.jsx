import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, updateEmail } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../api/api';
import Spinner from '../components/Spinner';

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: '', email: '', role: '', created_at: '' });
  const [originalData, setOriginalData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const firebaseUid = user?.uid || localStorage.getItem('firebaseUid');

  useEffect(() => {
    if (!firebaseUid) {
      navigate('/user-auth');
      return;
    }
    loadProfile();
  }, [firebaseUid]);

  async function loadProfile() {
    setLoading(true);
    const result = await getUserProfile(firebaseUid);
    if (result.success) {
      const u = result.data;
      setProfile(u);
      setOriginalData({ name: u.name || '', email: u.email || '' });
    } else {
      setErrorMsg('Failed to load profile: ' + (result.error || 'Unknown error'));
    }
    setLoading(false);
  }

  function enableEdit() {
    setEditMode(true);
    setSuccessMsg('');
    setErrorMsg('');
  }

  function cancelEdit() {
    setProfile(p => ({ ...p, name: originalData.name, email: originalData.email }));
    setEditMode(false);
    setSuccessMsg('');
    setErrorMsg('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile.name || !profile.email) {
      setErrorMsg('Please fill in all fields');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (user) {
        await updateProfile(user, { displayName: profile.name });
        if (profile.email !== user.email) {
          await updateEmail(user, profile.email);
        }
      }

      const result = await updateUserProfile(firebaseUid, {
        name: profile.name,
        email: profile.email,
      });

      if (result.success) {
        localStorage.setItem('userName', profile.name);
        localStorage.setItem('userEmail', profile.email);
        setOriginalData({ name: profile.name, email: profile.email });
        setEditMode(false);
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setErrorMsg('Failed to update profile: ' + err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const role = localStorage.getItem('userRole');
    if (role === 'student') navigate('/student-dashboard');
    else if (role === 'teacher') navigate('/teacher-dashboard');
    else if (role === 'admin') navigate('/admin-dashboard');
    else navigate('/user-dashboard');
  }

  const formattedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : '';

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.avatar}>
            <span style={{ fontSize: 40 }}>👤</span>
          </div>
          <h2 style={styles.title}>My Profile</h2>
          <p style={styles.subtitle}>Update your personal information</p>
        </div>

        {successMsg && (
          <div style={{ ...styles.infoBox, ...styles.successBox }}>
            ✅ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ ...styles.infoBox, ...styles.errorBox }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spinner />
            <p style={{ marginTop: 10, color: '#666' }}>Loading profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon}>👤</span>
                <input
                  style={{ ...styles.input, ...(editMode ? {} : styles.inputDisabled) }}
                  type="text"
                  value={profile.name || ''}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Full Name"
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon}>✉️</span>
                <input
                  style={{ ...styles.input, ...(editMode ? {} : styles.inputDisabled) }}
                  type="email"
                  value={profile.email || ''}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Email Address"
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Role</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon}>🪪</span>
                <input
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  type="text"
                  value={profile.role || ''}
                  disabled
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Member Since</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon}>📅</span>
                <input
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  type="text"
                  value={formattedDate}
                  disabled
                />
              </div>
            </div>

            {!editMode && (
              <button type="button" style={{ ...styles.btn, ...styles.primaryBtn }} onClick={enableEdit}>
                ✏️ Edit Profile
              </button>
            )}
            {editMode && (
              <>
                <button type="submit" style={{ ...styles.btn, ...styles.primaryBtn }} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
                <button type="button" style={{ ...styles.btn, ...styles.secondaryBtn }} onClick={cancelEdit}>
                  ✕ Cancel
                </button>
              </>
            )}

            <button type="button" style={{ ...styles.btn, ...styles.secondaryBtn }} onClick={goBack}>
              ← Back to Dashboard
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  body: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  container: {
    width: '100%',
    maxWidth: 600,
    background: '#fff',
    padding: 30,
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  header: { textAlign: 'center', marginBottom: 30 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  title: { color: '#333', marginBottom: 10 },
  subtitle: { color: '#666', fontSize: 14 },
  infoBox: {
    padding: 15,
    borderLeft: '4px solid',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
  },
  successBox: { background: '#d4edda', borderLeftColor: '#28a745', color: '#155724' },
  errorBox: { background: '#f8d7da', borderLeftColor: '#dc3545', color: '#721c24' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block', color: '#333' },
  inputWrapper: { position: 'relative' },
  icon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 },
  input: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    borderRadius: 8,
    border: '2px solid #e0e0e0',
    outline: 'none',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  inputDisabled: { background: '#f5f5f5', cursor: 'not-allowed' },
  btn: {
    width: '100%',
    padding: 12,
    marginTop: 10,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
  },
  secondaryBtn: { background: '#6c757d', color: '#fff' },
};
