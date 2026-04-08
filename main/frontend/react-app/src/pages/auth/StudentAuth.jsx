// Feature: html-to-react-migration
import { useState, useRef } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  auth,
  microsoftProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from '../../firebase';
import { registerUserInBackend, sendOTP, verifyOTP, lookupStudent, getOrgByCode } from '../../api/api';
import { validatePassword } from './UserAuth';

const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f6f9',
  fontFamily: 'Arial, sans-serif',
  padding: '1rem',
};
const cardStyle = {
  width: '100%',
  maxWidth: '400px',
  background: '#ffffff',
  padding: '25px',
  borderRadius: '12px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
};
const inputGroupStyle = { marginBottom: '15px' };
const labelStyle = { fontSize: '14px', marginBottom: '5px', display: 'block' };
const inputWrapStyle = { position: 'relative' };
const inputStyle = {
  width: '100%',
  padding: '10px 12px 10px 35px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  outline: 'none',
  boxSizing: 'border-box',
};
const btnBase = { width: '100%', padding: '10px', marginTop: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' };
const primaryBtn = { ...btnBase, background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', fontWeight: 700 };
const microsoftBtn = { ...btnBase, background: 'white', color: '#3c4043', border: '1.5px solid #dadce0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 600 };
const MicrosoftLogo = () => (
  <svg width="18" height="18" viewBox="0 0 21 21">
    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
  </svg>
);
const linkStyle = { textDecoration: 'none', color: 'rgb(1,5,255)' };
const centerRow = { paddingTop: '10px', display: 'flex', justifyContent: 'center' };
const warningBox = { marginTop: '20px', padding: '12px', background: '#fff3cd', borderLeft: '4px solid #ffc107', borderRadius: '8px', fontSize: '14px', color: '#856404' };
const errorListStyle = { margin: '6px 0 0 0', padding: '8px 12px', background: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: '6px', listStyle: 'none', fontSize: '13px', color: '#721c24' };
const inlineErrorStyle = { marginTop: '8px', padding: '8px 12px', background: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: '6px', fontSize: '13px', color: '#721c24' };
const inlineSuccessStyle = { marginTop: '8px', padding: '8px 12px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '6px', fontSize: '13px', color: '#155724' };

export default function StudentAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const orgCode = location.state?.orgCode || '';
  const orgEmailDomain = location.state?.orgEmailDomain || '';

  const [view, setView] = useState('login');
  const [loginStudentId, setLoginStudentId] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordErrors, setSignupPasswordErrors] = useState([]);
  const [signupError, setSignupError] = useState('');

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const [signupLoading, setSignupLoading] = useState(false);

  const pendingSignupData = useRef(null);

  if (!loading && user) return <Navigate to="/student-dashboard" replace />;

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    const studentId = loginStudentId.toUpperCase().trim();
    if (!studentId || studentId.length < 4) {
      setLoginError('Please enter your Roll Number / Student ID.');
      return;
    }
    const lookup = await lookupStudent(loginEmail);
    if (!lookup.success) {
      setLoginError('No student account found for this email.');
      return;
    }
    if (lookup.data.student_id?.toUpperCase() !== studentId) {
      setLoginError('Roll Number does not match this email. Please check and try again.');
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const u = cred.user;
      localStorage.setItem('firebaseUid', u.uid);
      localStorage.setItem('userRole', 'student');
      localStorage.setItem('userName', u.displayName || u.email);
      localStorage.setItem('userEmail', u.email);
      localStorage.setItem('studentId', studentId);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loginTime', Date.now().toString());
      navigate('/student-dashboard');
    } catch (err) {
      setLoginError(err.message);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setSignupError('');
    if (!orgCode) {
      setSignupError('Please sign up through your organisation. Go back and enter your organisation code first.');
      return;
    }
    if (orgEmailDomain) {
      const userDomain = signupEmail.split('@')[1]?.toLowerCase();
      if (userDomain !== orgEmailDomain.toLowerCase()) {
        setSignupError(`Your email domain (@${userDomain}) does not match this organisation's required domain (@${orgEmailDomain}).`);
        return;
      }
    }
    const validation = validatePassword(signupPassword);
    if (!validation.isValid) {
      setSignupPasswordErrors(validation.errors);
      return;
    }
    setSignupPasswordErrors([]);
    setSignupLoading(true);
    const result = await sendOTP(signupEmail);
    setSignupLoading(false);
    if (!result.success) {
      setSignupError('Failed to send verification code: ' + (result.data?.error || result.error || 'Unknown error'));
      return;
    }
    pendingSignupData.current = { name: signupName, email: signupEmail, password: signupPassword, orgCode };
    setView('otp');
  }

  async function handleOTP(e) {
    e.preventDefault();
    setOtpError('');
    const data = pendingSignupData.current;
    if (!data) return;
    const result = await verifyOTP(data.email, otpCode);
    if (!result.success) {
      setOtpError(result.data?.error || 'Invalid code. Please try again.');
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const u = cred.user;
      await updateProfile(u, { displayName: data.name });
      const backendResult = await registerUserInBackend(u.uid, data.email, data.name, 'student', data.orgCode);
      const studentId = backendResult.data?.student_id || '';
      localStorage.setItem('firebaseUid', u.uid);
      localStorage.setItem('userRole', 'student');
      localStorage.setItem('userName', data.name);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('studentId', studentId);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loginTime', Date.now().toString());
      pendingSignupData.current = null;
      navigate('/student-dashboard');
    } catch (err) {
      setOtpError(err.message);
    }
  }

  async function handleResendOTP() {
    const data = pendingSignupData.current;
    if (!data) return;
    await sendOTP(data.email);
  }

  async function handleForgot(e) {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMessage('Password reset email sent! Please check your inbox.');
    } catch (err) {
      setForgotError(err.message);
    }
  }

  async function handleMicrosoft() {
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      const u = result.user;
      // Domain check for org users
      if (orgEmailDomain) {
        const userDomain = u.email?.split('@')[1]?.toLowerCase();
        if (userDomain !== orgEmailDomain.toLowerCase()) {
          setLoginError(`Your Microsoft account (@${userDomain}) does not match this organisation's domain (@${orgEmailDomain}).`);
          return;
        }
      }
      const backendResult = await registerUserInBackend(u.uid, u.email, u.displayName || u.email, 'student', orgCode);
      const studentId = backendResult.data?.student_id || '';
      localStorage.setItem('firebaseUid', u.uid);
      localStorage.setItem('userRole', 'student');
      localStorage.setItem('userName', u.displayName || u.email);
      localStorage.setItem('userEmail', u.email);
      localStorage.setItem('studentId', studentId);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loginTime', Date.now().toString());
      navigate('/student-dashboard');
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setLoginError('An account with this email already exists. Please use a different sign-in method.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError(err.message);
      }
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#667eea', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
                <i className="fas fa-arrow-left" /> Back to Home
              </a>
            </div>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e293b' }}>Student Login</h2>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Roll Number</label>
              <div style={inputWrapStyle}>
                <input style={inputStyle} type="text"
                  placeholder="Enter your Roll Number (e.g. 2401350009)"
                  maxLength={20}
                  value={loginStudentId} onChange={e => setLoginStudentId(e.target.value)} required />
              </div>
              <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                Enter the roll number from your college email (before @)
              </small>
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email</label>
              <div style={inputWrapStyle}>
                <input style={inputStyle} type="email" placeholder="Enter your email"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              </div>
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapStyle}>
                <input style={inputStyle} type="password" placeholder="Enter your password"
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>
            </div>
            {loginError && <div style={inlineErrorStyle}>{loginError}</div>}
            <button type="submit" style={primaryBtn}>Login</button>
            <button type="button" style={microsoftBtn} onClick={handleMicrosoft}><MicrosoftLogo />Continue with Microsoft</button>
            <div style={centerRow}><p>Don't have an account? <a href="#" style={linkStyle} onClick={e => { e.preventDefault(); setView('signup'); }}>Signup</a></p></div>
            <div style={centerRow}><p><a href="#" style={linkStyle} onClick={e => { e.preventDefault(); setView('forgot'); }}>Forgot Password?</a></p></div>
            {loginError && <div style={warningBox}><strong>Warning:</strong> Unauthorized access attempts are monitored.</div>}
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignup}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e293b' }}>Student Signup</h2>
            {!orgCode && (
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '13px', color: '#856404' }}>
                ⚠️ You need to enter your organisation code first.{' '}
                <a href="/organization-id" style={{ color: '#667eea', fontWeight: 600 }}>Click here to start</a>
              </div>
            )}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Full Name</label>
              <div style={inputWrapStyle}>
                <input style={inputStyle} type="text" placeholder="Enter your name"
                  value={signupName} onChange={e => setSignupName(e.target.value)} required />
              </div>
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email</label>
              <div style={inputWrapStyle}>
                <input style={inputStyle} type="email" placeholder="Enter your email"
                  value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
              </div>
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapStyle}>
                <input style={inputStyle} type="password" placeholder="Enter your password"
                  value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
              </div>
              <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                Password must have: 6+ characters, 1 uppercase, 1 number, 1 special character
              </small>
              {signupPasswordErrors.length > 0 && (
                <ul style={errorListStyle} data-testid="password-errors">
                  {signupPasswordErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
            {signupError && <div style={inlineErrorStyle}>{signupError}</div>}
            <button type="submit" style={{ ...primaryBtn, opacity: signupLoading ? 0.7 : 1, cursor: signupLoading ? 'not-allowed' : 'pointer' }} disabled={signupLoading}>
              {signupLoading ? 'Sending code...' : 'Signup'}
            </button>
            <button type="button" style={microsoftBtn} onClick={handleMicrosoft}><MicrosoftLogo />Continue with Microsoft</button>
            <div style={centerRow}><p>Already have an account? <a href="#" style={linkStyle} onClick={e => { e.preventDefault(); setView('login'); }}>Login</a></p></div>
          </form>
        )}

        {view === 'otp' && (
          <form onSubmit={handleOTP}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e293b' }}>Verify Email</h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', color: '#1e293b' }}>
              Enter the 5-digit code sent to <strong>{pendingSignupData.current?.email}</strong>
            </p>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Verification Code</label>
              <div style={inputWrapStyle}>
                <input style={{ ...inputStyle, letterSpacing: '0.5rem', fontSize: '1.2rem', fontWeight: '700' }}
                  type="text" placeholder="Enter 5-digit code" maxLength={5}
                  value={otpCode} onChange={e => setOtpCode(e.target.value)} required />
              </div>
            </div>
            {otpError && <div style={inlineErrorStyle}>{otpError}</div>}
            <button type="submit" style={primaryBtn}>Verify &amp; Create Account</button>
            <div style={{ ...centerRow, marginTop: '10px' }}>
              <p><a href="#" style={linkStyle} onClick={e => { e.preventDefault(); handleResendOTP(); }}>Resend Code</a></p>
            </div>
            <div style={centerRow}>
              <p><a href="#" style={linkStyle} onClick={e => { e.preventDefault(); setView('signup'); }}>Back to Signup</a></p>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgot}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e293b' }}>Reset Password</h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', color: '#1e293b' }}>
              Enter your email to receive a password reset link
            </p>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email</label>
              <div style={inputWrapStyle}>
                <input style={inputStyle} type="email" placeholder="Enter your email"
                  value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
              </div>
            </div>
            {forgotError && <div style={inlineErrorStyle}>{forgotError}</div>}
            {forgotMessage && <div style={inlineSuccessStyle}>{forgotMessage}</div>}
            <button type="submit" style={primaryBtn}>Send Reset Link</button>
            <div style={centerRow}>
              <p>Remember your password? <a href="#" style={linkStyle} onClick={e => { e.preventDefault(); setView('login'); }}>Back to Login</a></p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}



