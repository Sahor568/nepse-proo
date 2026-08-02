import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, Shield, Bell, Monitor, Moon, LogOut, Sun, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, authFetch } from '../apiConfig';

const Section = ({ title, children }: any) => (
  <div className="card" style={{ marginBottom: '1.25rem' }}>
    <div className="card-header"><h2 className="card-title">{title}</h2></div>
    <div style={{ padding: '1.25rem' }}>{children}</div>
  </div>
);

const Field = ({ label, children }: any) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', marginBottom: '.4rem', fontSize: '.7rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</label>
    {children}
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: '', email: '', mobile: '', bio: '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('profileNotifs');
      return stored ? JSON.parse(stored) : { priceAlerts: true, newsAlerts: false, portfolioSummary: true };
    } catch {
      return { priceAlerts: true, newsAlerts: false, portfolioSummary: true };
    }
  });
  const [accountProvider, setAccountProvider] = useState<string>(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.provider || 'email';
    } catch {
      return 'email';
    }
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('profileNotifs', JSON.stringify(notifs));
  }, [notifs]);

  const fetchProfile = async () => {
    try {
      const res = await authFetch(`${API_BASE}/user/profile`);
      if (res.ok) {
        const data = await res.json();
        const currentUser = (() => {
          try {
            return JSON.parse(localStorage.getItem('user') || '{}');
          } catch {
            return {};
          }
        })();
        setProfile({
          name: data.name || '',
          email: data.email || '',
          mobile: data.mobile || '',
          bio: data.bio || ''
        });
        setAccountProvider(data.provider || currentUser.provider || 'email');
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
    setLoading(false);
  };

  const initials = profile.name ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

  const saveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    try {
      const res = await authFetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        const existingUser = (() => {
          try {
            return JSON.parse(localStorage.getItem('user') || '{}');
          } catch {
            return {};
          }
        })();
        localStorage.setItem('user', JSON.stringify({
          ...existingUser,
          name: data.name,
          email: data.email,
          mobile: data.mobile || '',
          bio: data.bio || '',
        }));
        setSaved(true);
        setProfileSuccess('Profile updated successfully.');
        setTimeout(() => setSaved(false), 2500);
        setTimeout(() => setProfileSuccess(''), 2500);
      } else {
        setProfileError(data.error || 'Failed to save profile.');
      }
    } catch (err) {
      console.error('Failed to save profile', err);
      setProfileError('Server sanga connection bhayena.');
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (accountProvider === 'google') {
      setPwError('Google sign-in accounts use Google for password management.');
      return;
    }
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError('Sabai fields bhana!');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Password match hudaina!');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('Kam saman 6 letters rakh!');
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/user/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next })
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess('Bhayo, password change bhayo!');
        setPwForm({ current: '', next: '', confirm: '' });
        setTimeout(() => setPwSuccess(''), 3000);
      } else {
        setPwError(data.error || ' Hudaina!');
      }
    } catch (err) {
      setPwError('Server sanga hudaina!');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Hey {profile.name?.split(' ')[0] || 'User'}! 👋</h1>
        {saved && (
          <div className="animate-fadeIn" style={{ padding: '.4rem .9rem', borderRadius: '.4rem', background: 'rgba(8,153,129,.12)', border: '1px solid rgba(8,153,129,.3)', color: 'var(--color-green)', fontSize: '.78rem', fontWeight: 600 }}>
            Saved! ✓
          </div>
        )}
      </div>

      {/* Avatar + basic info */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-blue), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', color: '#fff', flexShrink: 0, boxShadow: '0 4px 20px rgba(41,98,255,.4)' }}>
          {initials}
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{profile.name || 'No Name'}</p>
          <p style={{ fontSize: '.8rem', color: 'var(--color-muted)' }}>{profile.email}</p>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
            <span style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--color-green)', background: 'rgba(8,153,129,.1)', border: '1px solid rgba(8,153,129,.2)', padding: '.15rem .5rem', borderRadius: 99 }}>⚡ Trader</span>
            <span style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--color-blue)', background: 'rgba(41,98,255,.1)', border: '1px solid rgba(41,98,255,.2)', padding: '.15rem .5rem', borderRadius: 99 }}>🇳🇵 Nepal</span>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} className="btn btn-danger" style={{ marginLeft: 'auto', gap: '.4rem' }}>
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Personal Info */}
      <Section title={<><User className="w-4 h-4" style={{ color: 'var(--color-blue)' }} /> Profile</>}>
        {profileError && <p style={{ color: 'var(--color-red)', fontSize: '.8rem', marginBottom: '.75rem' }}>{profileError}</p>}
        {profileSuccess && <p style={{ color: 'var(--color-green)', fontSize: '.8rem', marginBottom: '.75rem' }}>{profileSuccess}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Name">
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: '.65rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none' }} />
              <input className="input" style={{ paddingLeft: '2rem', width: '100%', boxSizing: 'border-box' }} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
            </div>
          </Field>
          <Field label="Email">
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '.65rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none' }} />
              <input className="input" style={{ paddingLeft: '2rem', width: '100%', boxSizing: 'border-box' }} value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
            </div>
          </Field>
          <Field label="Phone">
            <div style={{ position: 'relative' }}>
              <Phone style={{ position: 'absolute', left: '.65rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none' }} />
              <input className="input" style={{ paddingLeft: '2rem', width: '100%', boxSizing: 'border-box' }} value={profile.mobile} onChange={e => setProfile({ ...profile, mobile: e.target.value })} />
            </div>
          </Field>
          <Field label="Bio">
            <textarea
              className="input"
              style={{ width: '100%', boxSizing: 'border-box', minHeight: '96px', resize: 'vertical' }}
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
            />
          </Field>
        </div>
        <button onClick={saveProfile} disabled={savingProfile} className="btn btn-primary" style={{ marginTop: '.5rem', gap: '.4rem', opacity: savingProfile ? 0.7 : 1 }}>
          <Save className="w-4 h-4" /> {savingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </Section>

      {/* Password */}
      <Section title={<><Lock className="w-4 h-4" style={{ color: 'var(--color-gold)' }} /> Password</>}>
        {accountProvider === 'google' && (
          <div style={{ marginBottom: '1rem', padding: '.8rem 1rem', borderRadius: '.5rem', background: 'rgba(41,98,255,.08)', border: '1px solid rgba(41,98,255,.2)', color: 'var(--color-muted)', fontSize: '.82rem' }}>
            This account uses Google Sign-In, so password changes are managed through Google.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          {([
            { key: 'current', label: 'Old Password' },
            { key: 'next', label: 'New Password' },
            { key: 'confirm', label: 'Confirm' }
          ] as const).map(({ key, label }) => (
            <Field key={key} label={label}>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '.65rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none' }} />
                <input className="input" style={{ paddingLeft: '2rem', paddingRight: key === 'current' ? '2rem' : '.75rem', width: '100%', boxSizing: 'border-box' }}
                  type={showPw ? 'text' : 'password'} placeholder="••••"
                  value={pwForm[key]} onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })} disabled={accountProvider === 'google'} />
                {key === 'current' && (
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: '.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }} disabled={accountProvider === 'google'}>
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </Field>
          ))}
        </div>
        {pwError && <p style={{ color: 'var(--color-red)', fontSize: '.8rem', marginTop: '.5rem' }}>{pwError}</p>}
        {pwSuccess && <p style={{ color: 'var(--color-green)', fontSize: '.8rem', marginTop: '.5rem' }}>{pwSuccess}</p>}
        <button onClick={updatePassword} className="btn btn-ghost" style={{ marginTop: '.25rem', gap: '.4rem', opacity: accountProvider === 'google' ? 0.65 : 1 }} disabled={accountProvider === 'google'}>
          <Shield className="w-4 h-4" /> Update Password
        </button>
      </Section>

      {/* Notifications */}
      <Section title={<><Bell className="w-4 h-4" style={{ color: 'var(--color-green)' }} /> Alerts</>}>
        {([
          ['priceAlerts', 'Price Alert', 'Stock price change bhayo vanera'],
          ['newsAlerts', 'News Alert', 'Market news aayera'],
          ['portfolioSummary', 'Portfolio Summary', 'Daily portfolio report'],
        ] as const).map(([key, label, desc]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '.85rem', color: '#fff', marginBottom: '.2rem' }}>{label}</p>
              <p style={{ fontSize: '.75rem', color: 'var(--color-muted)' }}>{desc}</p>
            </div>
            <button onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
              style={{ width: 42, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', transition: 'background .2s', position: 'relative', background: notifs[key] ? 'var(--color-green)' : 'var(--color-border)', flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: notifs[key] ? 21 : 3, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.4)' }} />
            </button>
          </div>
        ))}
      </Section>

      {/* Appearance */}
      <Section title={<><Monitor className="w-4 h-4" style={{ color: 'var(--color-blue)' }} /> Theme</>}>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          {[
            { t: 'dark', icon: Moon, label: 'Dark' },
            { t: 'light', icon: Sun, label: 'Light' }
          ].map(({ t, icon: Icon, label }) => (
            <button key={t} onClick={() => setTheme(t)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', padding: '1rem 1.5rem', borderRadius: '.6rem', cursor: 'pointer', border: `2px solid ${theme === t ? 'var(--color-blue)' : 'var(--color-border)'}`, background: theme === t ? 'rgba(41,98,255,.08)' : 'var(--color-panel)', color: theme === t ? 'var(--color-blue)' : 'var(--color-muted)', transition: 'all .15s' }}>
              <Icon className="w-5 h-5" />
              <span style={{ fontSize: '.75rem', fontWeight: 600 }}>{label}</span>
              {theme === t && <span style={{ fontSize: '.65rem', color: 'var(--color-green)' }}>✓</span>}
            </button>
          ))}
        </div>
      </Section>

      <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--color-dimmed)', fontSize: '.75rem' }}>
        Made with ❤️ for NEPSE 🇳🇵
      </div>
    </div>
  );
};

export default Profile;