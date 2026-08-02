import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const userId = params.get('userId');
    const name = params.get('name');
    const email = params.get('email');
    const provider = params.get('provider') || 'google';
    const verification = params.get('verification');

    if (token && userId) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: userId, name, email, provider }));
      setUserEmail(email || '');
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } else if (verification === 'google' && userId && email) {
      navigate(`/login?verification=google&userId=${userId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(34,197,94,.15)' }}>
            <CheckCircle className="w-10 h-10" style={{ color: '#22c55e' }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Login Successful!</h1>
          <p className="text-lg mb-1" style={{ color: 'var(--color-muted)' }}>
            Welcome back,
          </p>
          <p className="text-xl font-semibold text-white mb-2">
            {params.get('name') || 'User'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-dimmed)' }}>
            Logged in with <span className="text-white font-medium">Google</span>
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            ({userEmail})
          </p>
          <p className="mt-6 text-sm" style={{ color: 'var(--color-dimmed)' }}>
            Redirecting to dashboard...
          </p>
          <div className="w-48 h-1 mx-auto mt-3 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div className="h-full animate-pulse rounded-full" style={{ background: 'var(--color-green)', width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white">Signing you in with Google...</p>
      </div>
    </div>
  );
};

export default GoogleCallback;