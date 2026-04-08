import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';



/* ── Navbar ── */
function Navbar() {
  const navRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('lp-scrolled', window.scrollY > 50);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav ref={navRef} className="lp-nav">
      <a href="#" className="lp-nav-logo" onClick={scrollTo('lp-hero')}>
        <i className="fas fa-cloud" /> Sky Vault
      </a>
      <div className="lp-nav-links">
        <a href="#lp-about" onClick={scrollTo('lp-about')}>About</a>
        <a href="#lp-features" onClick={scrollTo('lp-features')}>Features</a>
        <a href="#lp-how" onClick={scrollTo('lp-how')}>How It Works</a>
        <a href="#lp-tech" onClick={scrollTo('lp-tech')}>Tech Stack</a>
        <a href="/get-started" className="lp-nav-cta" onClick={e => { e.preventDefault(); navigate('/get-started'); }}>Get Started</a>
      </div>
    </nav>
  );
}

/* ── Hero ── */
function Hero() {
  const navigate = useNavigate();
  return (
    <section id="lp-hero" className="lp-hero">
      <div className="lp-hero-content">
        <div className="lp-hero-badge">
          <i className="fas fa-shield-alt" /> Secure · Fast · Organised
        </div>
        <h1>Your Files.<br /><span>Anywhere. Always.</span></h1>
        <p>
          Sky Vault is a cloud storage platform built for individuals and organisations —
          upload, manage, and access your files securely from any browser.
        </p>
        <div className="lp-hero-btns">
          <a href="/get-started" className="lp-btn-primary" onClick={e => { e.preventDefault(); navigate('/get-started'); }}>
            <i className="fas fa-rocket" /> Get Started Free
          </a>
          <a href="#lp-features" className="lp-btn-secondary" onClick={e => { e.preventDefault(); document.getElementById('lp-features')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <i className="fas fa-play-circle" /> See Features
          </a>
        </div>
        <div className="lp-hero-stats">
          <div className="lp-hero-stat"><span className="lp-stat-num">4</span><div className="lp-stat-label">User Roles</div></div>
          <div className="lp-hero-stat"><span className="lp-stat-num">20 GB</span><div className="lp-stat-label">Free Storage</div></div>
          <div className="lp-hero-stat"><span className="lp-stat-num">100%</span><div className="lp-stat-label">Secure</div></div>
        </div>
      </div>
    </section>
  );
}

/* ── About ── */
function About() {
  return (
    <section id="lp-about" className="lp-about">
      <div className="lp-container">
        <div className="lp-about-grid">
          <div className="lp-about-text">
            <div className="lp-section-label">About Sky Vault</div>
            <h2 className="lp-section-title">More than just file storage</h2>
            <p>Sky Vault is a full-stack cloud storage platform designed for both individual users and educational organisations. It combines secure file management with a complete organisation system for schools and institutions.</p>
            <p>Whether you're a student storing assignments, a teacher sharing resources, or an admin managing your school's digital workspace — Sky Vault has you covered.</p>
            <div className="lp-about-features">
              <div className="lp-about-feature"><i className="fas fa-lock" /><div className="lp-about-feature-text"><strong>End-to-end security</strong><span>Firebase authentication + Supabase storage with user isolation</span></div></div>
              <div className="lp-about-feature"><i className="fas fa-building" /><div className="lp-about-feature-text"><strong>Organisation management</strong><span>Full admin panel to manage teachers, students, and classes</span></div></div>
              <div className="lp-about-feature"><i className="fas fa-bolt" /><div className="lp-about-feature-text"><strong>Real-time notifications</strong><span>Instant updates via Supabase Realtime — no page refresh needed</span></div></div>
            </div>
          </div>
          <div className="lp-about-visual">
            <div className="lp-about-visual-title"><i className="fas fa-cloud-upload-alt" /> What you can do</div>
            {[
              ['fas fa-upload','Upload any file type'],
              ['fas fa-folder','Organise into folders'],
              ['fas fa-eye','Preview images, PDFs, videos'],
              ['fas fa-download','Download anytime'],
              ['fas fa-trash-restore','Trash and restore files'],
              ['fas fa-users','Manage your organisation'],
              ['fas fa-bell','Real-time notifications'],
              ['fas fa-search','Search across all files'],
            ].map(([icon, text]) => (
              <div key={text} className="lp-about-visual-item"><i className={icon} /> {text}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features ── */
const FEATURES = [
  { color: 'fi-purple', icon: 'fas fa-shield-alt', title: 'Secure Authentication', desc: 'Firebase-powered login with email/password and Google OAuth. Strong password requirements enforced on all accounts.' },
  { color: 'fi-blue', icon: 'fas fa-cloud-upload-alt', title: 'File Upload & Storage', desc: 'Upload any file type to Supabase Storage. Files are stored securely with unique paths per user — no cross-user access.' },
  { color: 'fi-green', icon: 'fas fa-eye', title: 'File Preview', desc: 'Preview images, PDFs, videos, audio, and text files directly in the browser without downloading.' },
  { color: 'fi-orange', icon: 'fas fa-folder-open', title: 'Folder Organisation', desc: 'Create folders to organise your files. Navigate in and out of folders with a clean, intuitive interface.' },
  { color: 'fi-pink', icon: 'fas fa-building', title: 'Organisation System', desc: 'Admins create organisations with unique join codes. Teachers and students join using the code and get role-based access.' },
  { color: 'fi-teal', icon: 'fas fa-bell', title: 'Real-time Notifications', desc: 'Class invites, assignment posts, and submissions appear instantly via Supabase Realtime — no refresh needed.' },
  { color: 'fi-purple', icon: 'fas fa-chalkboard-teacher', title: 'Class Management', desc: 'Teachers create classes, post assignments, upload notes, and track student submissions with marks.' },
  { color: 'fi-blue', icon: 'fas fa-search', title: 'File Search', desc: 'Search across all your files by name with live debounced results. Filter by file type — images, documents, videos, audio.' },
  { color: 'fi-green', icon: 'fas fa-trash-restore', title: 'Trash & Restore', desc: 'Deleted files go to trash first. Restore them anytime or permanently delete. Empty trash in one click.' },
];

function Features() {
  return (
    <section id="lp-features" className="lp-section">
      <div className="lp-container">
        <div className="lp-text-center">
          <div className="lp-section-label">Features</div>
          <h2 className="lp-section-title">Everything you need</h2>
          <p className="lp-section-sub">A complete set of tools for personal file management and organisation-wide collaboration.</p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature-card">
              <div className={`lp-feature-icon ${f.color}`}><i className={f.icon} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ── */
function HowItWorks() {
  const steps = [
    { n: 1, title: 'Choose Your Role', desc: 'Select whether you\'re an individual user or part of an organisation as a student, teacher, or admin.' },
    { n: 2, title: 'Create Account', desc: 'Sign up with email and password or continue with Google. Your account is secured by Firebase Authentication.' },
    { n: 3, title: 'Join or Create Org', desc: 'Admins create an organisation and get a unique join code. Teachers and students use that code to join.' },
    { n: 4, title: 'Upload & Manage', desc: 'Upload files, create folders, preview content, and collaborate with your organisation — all in one place.' },
  ];
  return (
    <section id="lp-how" className="lp-how">
      <div className="lp-container">
        <div className="lp-text-center">
          <div className="lp-section-label">How It Works</div>
          <h2 className="lp-section-title">Up and running in minutes</h2>
          <p className="lp-section-sub">Getting started is simple whether you're an individual user or setting up for your whole organisation.</p>
        </div>
        <div className="lp-steps">
          {steps.map((s) => (
            <div key={s.n} className="lp-step">
              <div className="lp-step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Tech Stack ── */
function TechStack() {
  const techs = [
    { icon: '🔥', name: 'Firebase', desc: 'Authentication & Google OAuth' },
    { icon: '⚡', name: 'Supabase', desc: 'PostgreSQL database & file storage' },
    { icon: '🐍', name: 'Python Flask', desc: 'Backend REST API server' },
    { icon: '⚛️', name: 'React + Vite', desc: 'Frontend SPA with React Router' },
    { icon: '🗄️', name: 'PostgreSQL', desc: 'Relational database via Supabase' },
    { icon: '📡', name: 'Supabase Realtime', desc: 'Live notifications via WebSockets' },
  ];
  return (
    <section id="lp-tech" className="lp-section">
      <div className="lp-container">
        <div className="lp-text-center">
          <div className="lp-section-label">Tech Stack</div>
          <h2 className="lp-section-title">Built with modern tools</h2>
          <p className="lp-section-sub">Sky Vault is built on a reliable, scalable stack using industry-standard technologies.</p>
        </div>
        <div className="lp-tech-grid">
          {techs.map((t) => (
            <div key={t.name} className="lp-tech-card">
              <div className="lp-tech-icon">{t.icon}</div>
              <h4>{t.name}</h4>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Roles ── */
function Roles() {
  const roles = [
    { cls: 'rc-user', icon: 'fas fa-user', title: 'Individual User', desc: 'Personal cloud storage with full file management.', items: ['Upload & organise files', 'Preview & download', '20 GB free storage'] },
    { cls: 'rc-student', icon: 'fas fa-user-graduate', title: 'Student', desc: 'Access class materials and submit assignments.', items: ['Join classes via invite', 'Submit assignments', 'Auto-generated Student ID'] },
    { cls: 'rc-teacher', icon: 'fas fa-chalkboard-teacher', title: 'Teacher', desc: 'Create classes, post assignments, manage students.', items: ['Create & manage classes', 'Post assignments', 'Review submissions'] },
    { cls: 'rc-admin', icon: 'fas fa-user-shield', title: 'Organisation Admin', desc: "Full control over your organisation's workspace.", items: ['Manage all members', 'Promote to teacher/student', 'View all classes'] },
  ];
  return (
    <section className="lp-roles-section">
      <div className="lp-container">
        <div className="lp-text-center">
          <div className="lp-section-label">User Roles</div>
          <h2 className="lp-section-title">Built for everyone</h2>
          <p className="lp-section-sub">Four distinct roles, each with their own dashboard and capabilities.</p>
        </div>
        <div className="lp-roles-grid">
          {roles.map((r) => (
            <div key={r.title} className={`lp-role-card ${r.cls}`}>
              <i className={r.icon} />
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
              <ul>{r.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Call-to-Action / Get Started ── */
function GetStarted() {
  return (
    <section id="lp-getstarted" className="lp-get-started">
      <div className="lp-container">
        <h2>Ready to get started?</h2>
        <p>Choose how you'd like to use Sky Vault and create your account in seconds.</p>
        <div className="lp-role-selector">
          <Link to="/user-auth" className="lp-role-btn-card">
            <i className="fas fa-user" />
            <h3>Individual User</h3>
            <p>Personal file storage</p>
          </Link>
          <Link to="/organization-id" className="lp-role-btn-card">
            <i className="fas fa-building" />
            <h3>Organisation</h3>
            <p>For schools &amp; institutions</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Contact Us ── */
function ContactUs() {
  return (
    <section id="lp-contact" className="lp-section" style={{ background: 'var(--lp-light)' }}>
      <div className="lp-container">
        <div className="lp-text-center" style={{ marginBottom: '3rem' }}>
          <div className="lp-section-label">Contact Us</div>
          <h2 className="lp-section-title">Get in Touch</h2>
          <p className="lp-section-sub">Have questions or need support? We're here to help.</p>
        </div>
        <div className="lp-contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem', color: 'white' }}>
              <i className="fas fa-envelope" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Email Us</h3>
            <a href="mailto:skyvault.company08@gmail.com" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              skyvault.company08@gmail.com
            </a>
          </div>
          <div style={{ background: 'white', borderRadius: 16, padding: '2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem', color: 'white' }}>
              <i className="fas fa-map-marker-alt" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Address</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Najafgarh, New Delhi<br />India</p>
          </div>
          <div style={{ background: 'white', borderRadius: 16, padding: '2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem', color: 'white' }}>
              <i className="fas fa-clock" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Support Hours</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Mon – Fri: 9 AM – 6 PM<br />Sat: 10 AM – 2 PM</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <p><strong>Sky Vault</strong> &nbsp;·&nbsp; Secure cloud storage for everyone &nbsp;·&nbsp; Built with React, Firebase, Supabase &amp; Flask</p>
    </footer>
  );
}

/* ── CSS ── */
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;overflow-x:hidden;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:#334155;background:white}
:root{--lp-purple:#667eea;--lp-purple2:#764ba2;--lp-dark:#1e293b;--lp-text:#334155;--lp-muted:#64748b;--lp-light:#f8fafc}
html{scroll-behavior:smooth}

.lp-nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;transition:all .3s}
.lp-nav.lp-scrolled{background:rgba(255,255,255,.95);backdrop-filter:blur(20px);box-shadow:0 2px 20px rgba(0,0,0,.08)}
.lp-nav-logo{display:flex;align-items:center;gap:.6rem;font-size:1.4rem;font-weight:800;color:white;text-decoration:none}
.lp-nav.lp-scrolled .lp-nav-logo{color:var(--lp-dark)}
.lp-nav-logo i{color:#a5b4fc}
.lp-nav.lp-scrolled .lp-nav-logo i{color:var(--lp-purple)}
.lp-nav-links{display:flex;align-items:center;gap:2rem}
.lp-nav-links a{color:rgba(255,255,255,.85);text-decoration:none;font-weight:500;font-size:.9rem;transition:color .2s}
.lp-nav.lp-scrolled .lp-nav-links a{color:var(--lp-muted)}
.lp-nav-links a:hover{color:white}
.lp-nav.lp-scrolled .lp-nav-links a:hover{color:var(--lp-purple)}
.lp-nav-cta{background:white;color:#667eea !important;padding:.5rem 1.25rem;border-radius:25px;font-weight:700;font-size:.875rem;text-decoration:none;transition:all .2s;display:inline-block}
.lp-nav.lp-scrolled .lp-nav-cta{background:#667eea;color:white !important}
.lp-nav-cta:hover{transform:translateY(-2px);box-shadow:0 4px 15px rgba(102,126,234,.4)}

.lp-hero{min-height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;text-align:center;padding:6rem 2rem 4rem;position:relative;overflow:hidden}
.lp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 50%,rgba(255,255,255,.08) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,.06) 0%,transparent 40%)}
.lp-hero-content{position:relative;z-index:1;max-width:800px}
.lp-hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:white;padding:.4rem 1rem;border-radius:25px;font-size:.8rem;font-weight:600;margin-bottom:1.5rem;backdrop-filter:blur(10px)}
.lp-hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:900;color:white;line-height:1.1;margin-bottom:1.5rem;text-shadow:0 4px 30px rgba(0,0,0,.2)}
.lp-hero h1 span{background:linear-gradient(135deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.lp-hero p{font-size:1.2rem;color:rgba(255,255,255,.9);max-width:600px;margin:0 auto 2.5rem;line-height:1.7}
.lp-hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.lp-btn-primary{background:white;color:var(--lp-purple);padding:.875rem 2rem;border-radius:50px;font-weight:700;font-size:1rem;text-decoration:none;transition:all .3s;box-shadow:0 8px 30px rgba(0,0,0,.2)}
.lp-btn-primary:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.3)}
.lp-btn-secondary{background:rgba(255,255,255,.15);color:white;padding:.875rem 2rem;border-radius:50px;font-weight:700;font-size:1rem;text-decoration:none;border:2px solid rgba(255,255,255,.3);transition:all .3s;backdrop-filter:blur(10px)}
.lp-btn-secondary:hover{background:rgba(255,255,255,.25);transform:translateY(-3px)}
.lp-hero-stats{display:flex;gap:3rem;justify-content:center;margin-top:4rem;flex-wrap:wrap}
.lp-hero-stat{text-align:center;color:white}
.lp-stat-num{font-size:2rem;font-weight:800;display:block}
.lp-stat-label{font-size:.8rem;opacity:.8;margin-top:.2rem}

.lp-section{padding:5rem 2rem}
.lp-container{max-width:1100px;margin:0 auto}
.lp-section-label{font-size:.75rem;font-weight:700;color:var(--lp-purple);text-transform:uppercase;letter-spacing:2px;margin-bottom:.75rem}
.lp-section-title{font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;color:var(--lp-dark);margin-bottom:1rem;line-height:1.2}
.lp-section-sub{font-size:1.05rem;color:var(--lp-muted);max-width:560px;line-height:1.7}
.lp-text-center{text-align:center}
.lp-text-center .lp-section-sub{margin:0 auto}

.lp-about{background:var(--lp-light);padding:5rem 2rem}
.lp-about-grid{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;margin-top:3rem}
.lp-about-text p{color:var(--lp-muted);line-height:1.8;margin-bottom:1rem;font-size:1rem}
.lp-about-features{display:grid;gap:1rem;margin-top:1.5rem}
.lp-about-feature{display:flex;align-items:flex-start;gap:.75rem;padding:1rem;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.lp-about-feature i{color:var(--lp-purple);font-size:1.1rem;margin-top:.1rem;flex-shrink:0}
.lp-about-feature-text strong{display:block;font-size:.9rem;color:var(--lp-dark);margin-bottom:.2rem}
.lp-about-feature-text span{font-size:.825rem;color:var(--lp-muted)}
.lp-about-visual{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:24px;padding:2.5rem;color:white;box-shadow:0 20px 60px rgba(102,126,234,.3)}
.lp-about-visual-title{font-size:1.1rem;font-weight:700;margin-bottom:1.5rem;opacity:.9}
.lp-about-visual-item{display:flex;align-items:center;gap:.75rem;padding:.75rem;background:rgba(255,255,255,.1);border-radius:10px;margin-bottom:.75rem;font-size:.875rem}
.lp-about-visual-item i{width:20px;text-align:center}

.lp-features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;margin-top:3rem}
.lp-feature-card{background:white;border:1px solid #e2e8f0;border-radius:20px;padding:2rem;transition:all .3s}
.lp-feature-card:hover{transform:translateY(-6px);box-shadow:0 20px 50px rgba(0,0,0,.1);border-color:var(--lp-purple)}
.lp-feature-icon{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;margin-bottom:1.25rem}
.fi-purple{background:#ede9fe;color:#7c3aed}
.fi-blue{background:#dbeafe;color:#2563eb}
.fi-green{background:#dcfce7;color:#16a34a}
.fi-orange{background:#ffedd5;color:#ea580c}
.fi-pink{background:#fce7f3;color:#be185d}
.fi-teal{background:#ccfbf1;color:#0f766e}
.lp-feature-card h3{font-size:1.05rem;font-weight:700;color:var(--lp-dark);margin-bottom:.5rem}
.lp-feature-card p{font-size:.875rem;color:var(--lp-muted);line-height:1.6}

.lp-how{background:var(--lp-light);padding:5rem 2rem}
.lp-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2rem;margin-top:3rem}
.lp-step{text-align:center;padding:2rem 1.5rem;background:white;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,.06)}
.lp-step-num{width:44px;height:44px;background:linear-gradient(135deg,var(--lp-purple),var(--lp-purple2));color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;margin:0 auto 1.25rem}
.lp-step h3{font-size:1rem;font-weight:700;color:var(--lp-dark);margin-bottom:.5rem}
.lp-step p{font-size:.85rem;color:var(--lp-muted);line-height:1.6}

.lp-tech-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1.25rem;margin-top:3rem}
.lp-tech-card{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:1.5rem;text-align:center;transition:all .3s}
.lp-tech-card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,.1);border-color:var(--lp-purple)}
.lp-tech-icon{font-size:2.2rem;margin-bottom:.75rem}
.lp-tech-card h4{font-size:.9rem;font-weight:700;color:var(--lp-dark);margin-bottom:.25rem}
.lp-tech-card p{font-size:.75rem;color:var(--lp-muted)}

.lp-roles-section{background:var(--lp-light);padding:5rem 2rem}
.lp-roles-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;margin-top:3rem}
.lp-role-card{border-radius:20px;padding:2rem;color:white;position:relative;overflow:hidden}
.lp-role-card::before{content:'';position:absolute;top:-30px;right:-30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.1)}
.rc-user{background:linear-gradient(135deg,#667eea,#764ba2)}
.rc-student{background:linear-gradient(135deg,#f093fb,#f5576c)}
.rc-teacher{background:linear-gradient(135deg,#4facfe,#00f2fe)}
.rc-admin{background:linear-gradient(135deg,#43e97b,#38f9d7)}
.lp-role-card i{font-size:2rem;margin-bottom:1rem;display:block;opacity:.9}
.lp-role-card h3{font-size:1.1rem;font-weight:700;margin-bottom:.5rem}
.lp-role-card p{font-size:.85rem;opacity:.85;line-height:1.6}
.lp-role-card ul{margin-top:.75rem;padding-left:1rem;font-size:.8rem;opacity:.85}
.lp-role-card ul li{margin-bottom:.25rem}

.lp-get-started{background:linear-gradient(135deg,#667eea,#764ba2);text-align:center;padding:5rem 2rem}
.lp-get-started h2{font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;color:white;margin-bottom:1rem}
.lp-get-started p{color:rgba(255,255,255,.85);font-size:1.05rem;max-width:500px;margin:0 auto 2.5rem}
.lp-role-selector{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.25rem;max-width:700px;margin:0 auto}
.lp-role-btn-card{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);border-radius:20px;padding:1.75rem 1.25rem;text-align:center;cursor:pointer;transition:all .3s;color:white;backdrop-filter:blur(10px);text-decoration:none;display:block}
.lp-role-btn-card:hover{background:rgba(255,255,255,.22);transform:translateY(-6px);border-color:rgba(255,255,255,.5)}
.lp-role-btn-card i{font-size:2rem;margin-bottom:.75rem;display:block}
.lp-role-btn-card h3{font-size:1rem;font-weight:700;margin-bottom:.25rem;color:white}
.lp-role-btn-card p{font-size:.8rem;opacity:.8;color:white}

.lp-footer{background:var(--lp-dark);color:rgba(255,255,255,.6);text-align:center;padding:2rem;font-size:.875rem}
.lp-footer strong{color:white}

@media(max-width:768px){
  .lp-about-grid{grid-template-columns:1fr}
  .lp-nav-links{display:none}
  .lp-hero-stats{gap:1.5rem}
  .lp-contact-grid{grid-template-columns:1fr!important}
}
`;

/* ── Root export ── */
export default function Landing() {
  return (
    <>
      <style>{CSS}</style>
      <Navbar />
      <Hero />
      <About />
      <Features />
      <HowItWorks />
      <TechStack />
      <Roles />
      <GetStarted />
      <ContactUs />
      <Footer />
    </>
  );
}
