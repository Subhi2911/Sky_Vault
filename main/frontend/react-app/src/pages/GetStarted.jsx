import { Link } from 'react-router-dom';

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#334155}
.gs-root{min-height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;position:relative;overflow:hidden}
.gs-root::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 50%,rgba(255,255,255,.08) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,.06) 0%,transparent 40%)}
.gs-back{display:inline-flex;align-items:center;gap:.5rem;color:rgba(255,255,255,.85);text-decoration:none;font-size:.9rem;font-weight:600;transition:color .2s;margin-bottom:1.25rem;align-self:flex-start}
.gs-back:hover{color:white}
.gs-card{position:relative;z-index:1;background:rgba(255,255,255,.12);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.2);border-radius:28px;padding:3rem 2.5rem;max-width:640px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.gs-logo{display:flex;align-items:center;justify-content:center;gap:.6rem;font-size:1.6rem;font-weight:800;color:white;margin-bottom:2rem}
.gs-logo i{font-size:1.8rem;color:#a5b4fc}
.gs-title{font-size:clamp(1.75rem,5vw,2.25rem);font-weight:900;color:white;margin-bottom:.75rem;line-height:1.2}
.gs-sub{color:rgba(255,255,255,.8);font-size:1rem;line-height:1.6;margin-bottom:2.5rem;max-width:420px;margin-left:auto;margin-right:auto}
.gs-options{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
.gs-option{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);border-radius:20px;padding:2rem 1.5rem;text-align:center;cursor:pointer;transition:all .3s;color:white;text-decoration:none;display:block}
.gs-option:hover{background:rgba(255,255,255,.22);transform:translateY(-6px);border-color:rgba(255,255,255,.5);box-shadow:0 12px 40px rgba(0,0,0,.2)}
.gs-option-icon{font-size:2.5rem;margin-bottom:1rem;display:block}
.gs-option h3{font-size:1.1rem;font-weight:700;margin-bottom:.4rem;color:white}
.gs-option p{font-size:.825rem;opacity:.8;line-height:1.5;color:white}
.gs-option-badge{display:inline-block;background:rgba(255,255,255,.2);border-radius:20px;padding:.2rem .75rem;font-size:.7rem;font-weight:700;margin-top:.75rem;letter-spacing:.5px;text-transform:uppercase}
.gs-wrapper{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-start;max-width:640px;width:100%}
@media(max-width:480px){
  .gs-options{grid-template-columns:1fr}
  .gs-card{padding:2rem 1.25rem}
  .gs-root{padding:1.25rem}
}
`;

export default function GetStarted() {
  return (
    <>
      <style>{CSS}</style>
      <div className="gs-root">
        <div className="gs-wrapper">
          <Link to="/" className="gs-back">
            <i className="fas fa-arrow-left" /> Back to Home
          </Link>
          <div className="gs-card">
            <div className="gs-logo">
              <i className="fas fa-cloud" /> Sky Vault
            </div>
            <h1 className="gs-title">How would you like to use Sky Vault?</h1>
            <p className="gs-sub">Choose your account type to get started. You can always switch later.</p>
            <div className="gs-options">
              <Link to="/user-auth" className="gs-option">
                <span className="gs-option-icon"><i className="fas fa-user" /></span>
                <h3>Individual User</h3>
                <p>Personal cloud storage with 20 GB free. Upload, organise, and access your files from anywhere.</p>
                <span className="gs-option-badge">Free · 20 GB</span>
              </Link>
              <Link to="/organization-id" className="gs-option">
                <span className="gs-option-icon"><i className="fas fa-building" /></span>
                <h3>Organisation</h3>
                <p>For schools and institutions. Join as a student, teacher, or admin using your organisation code.</p>
                <span className="gs-option-badge">Schools &amp; Institutions</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
