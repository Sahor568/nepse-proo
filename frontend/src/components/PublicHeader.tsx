import { Link, useNavigate } from 'react-router-dom';

const isAuth = () => !!localStorage.getItem('token');

const PublicHeader = () => {
  const navigate = useNavigate();
  const loggedIn = isAuth();

  return (
    <header style={{
      height: 56,
      background: 'var(--color-panel)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.25rem',
      gap: '1.5rem',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <Link to={loggedIn ? '/dashboard' : '/login'} style={{ display: 'flex', alignItems: 'center', gap: '.65rem', textDecoration: 'none' }}>
        <img src="/nepseprologo.png" alt="NEPSE Pro" style={{ width: 32, height: 32 }} />
        <div>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: '.85rem', lineHeight: 1.2 }}>NEPSE PRO</div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Live Terminal</div>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--color-border)', flexShrink: 0 }} />

      {/* Info Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '.1rem', flex: 1 }}>
        {[
          { to: '/about', label: 'About' },
          { to: '/how-to-use', label: 'How to Use' },
          { to: '/terms', label: 'Terms' },
          { to: '/disclaimer', label: 'Disclaimer' },
        ].map(link => (
          <Link key={link.to} to={link.to}
            style={{
              fontSize: '.72rem', fontWeight: 600, color: 'var(--color-muted)',
              padding: '.3rem .6rem', borderRadius: 6, textDecoration: 'none',
              transition: 'all .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--color-border)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Auth Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        {loggedIn ? (
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ padding: '.4rem .9rem', fontSize: '.75rem' }}>
            Dashboard
          </button>
        ) : (
          <>
            <button onClick={() => navigate('/login')} className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.75rem' }}>
              Sign In
            </button>
            <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ padding: '.4rem .9rem', fontSize: '.75rem' }}>
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default PublicHeader;
