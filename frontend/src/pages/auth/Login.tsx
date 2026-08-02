import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, MailCheck } from 'lucide-react';
import { AUTH_BASE } from '../../apiConfig';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = React.useState(0);

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  React.useEffect(() => {
    const verification = searchParams.get('verification');
    const pendingUserId = searchParams.get('userId');
    const pendingEmail = searchParams.get('email');

    if (verification === 'google' && pendingUserId && pendingEmail) {
      setRequiresVerification(true);
      setUserId(Number(pendingUserId));
      setPendingEmail(pendingEmail);
      setFormData((current) => ({ ...current, email: pendingEmail }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          setRequiresVerification(true);
          setPendingEmail(data.email);
          setUserId(data.userId);
          setLoading(false);
          return;
        }
        setError(data.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError('Unable to connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    localStorage.setItem('guest', 'true');
    navigate('/dashboard');
  };

  const handleGoogleLogin = () => {
    window.location.href = `${AUTH_BASE}/google`;
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`login-otp-${index + 1}`);
      next?.focus();
    }
  };

  const verifyEmailOtp = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter a complete 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE}/verify/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp: enteredOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const resendEmailOtp = async () => {
    if (resendTimer > 0 || !userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE}/resend/email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend code.');
        return;
      }
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  if (requiresVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        <div className="orb w-96 h-96 top-0 right-0 opacity-20" style={{ background: 'var(--color-blue)' }} />
        <div className="orb w-80 h-80 bottom-0 left-0 opacity-10" style={{ background: 'var(--color-green)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="flex justify-center mb-8 animate-fadeUp">
              <div className="flex items-center gap-3">
              <img src="/nepseprologo.png" alt="NEPSE Pro" style={{ width: 40, height: 40 }} />
              <div>
                <div className="text-lg font-bold text-white tracking-wide">NEPSE Pro</div>
                <div className="text-[10px] font-medium tracking-[0.15em] uppercase" style={{ color: 'var(--color-muted)' }}>Trading Terminal</div>
              </div>
            </div>
          </div>
          <div className="card glow-blue animate-fadeUp delay-100">
            <div className="p-7 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(34,197,94,.15)' }}>
                <MailCheck className="w-8 h-8" style={{ color: '#22c55e' }} />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Verify Your Email</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                {pendingEmail
                  ? 'Please verify your email to finish signing in.'
                  : 'Please verify your email first.'}
                <br />
                <span className="font-semibold text-white">{pendingEmail}</span>
              </p>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(242,54,69,.1)', border: '1px solid rgba(242,54,69,.3)', color: 'var(--color-red)' }}>
                  {error}
                </div>
              )}
              <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`login-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-lg border text-white"
                    style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)' }}
                  />
                ))}
              </div>
              <button onClick={verifyEmailOtp} disabled={loading}
                className="btn btn-primary w-full py-2.5 mb-4">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify Email'}
              </button>
              <button onClick={resendEmailOtp} disabled={loading || resendTimer > 0}
                className="text-sm hover:underline" style={{ color: 'var(--color-muted)' }}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Didn't receive code? Resend"}
              </button>
              <p className="mt-6 text-xs" style={{ color: 'var(--color-dimmed)' }}>
                Back to <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-blue)' }}>Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Background orbs */}
      <div className="orb w-96 h-96 top-0 right-0 opacity-20" style={{ background: 'var(--color-blue)' }} />
      <div className="orb w-80 h-80 bottom-0 left-0 opacity-10" style={{ background: 'var(--color-green)' }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fadeUp">
          <div className="flex items-center gap-3">
            <img src="/nepseprologo.png" alt="NEPSE Pro" style={{ width: 40, height: 40 }} />
            <div>
              <div className="text-lg font-bold text-white tracking-wide">NEPSE Pro</div>
              <div className="text-[10px] font-medium tracking-[0.15em] uppercase" style={{ color: 'var(--color-muted)' }}>Trading Terminal</div>
            </div>
          </div>
        </div>

        <div className="card glow-blue animate-fadeUp delay-100">
          <div className="p-7">
            <h1 className="text-xl font-bold text-white mb-1">Sign In</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>Access your NEPSE trading dashboard</p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg text-sm font-medium animate-fadeIn"
                style={{ background: 'rgba(242,54,69,.1)', border: '1px solid rgba(242,54,69,.3)', color: 'var(--color-red)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                  <input
                    id="login-email"
                    type="email"
                    className="input icon-left"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="input icon-left pr-10"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-2.5 mt-2"
                style={{ fontSize: '.875rem' }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Sign In
                  </span>
                )}
              </button>
            </form>

            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>or continue with</span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="btn btn-secondary w-full py-2.5 mt-2"
              style={{ background: '#6b7280', color: 'white', border: 'none', fontSize: '.875rem' }}
            >
              Continue as Guest
            </button>
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn w-full py-2.5 flex items-center justify-center gap-3 hover:opacity-90 transition-opacity mt-2"
              style={{ background: '#4285F4', color: 'white', border: 'none', fontSize: '.875rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold hover:underline" style={{ color: 'var(--color-blue)' }}>Create one</Link>
            </p>
          </div>
        </div>

        {/* Demo hint */}
        <div className="text-center mt-4 animate-fadeUp delay-300 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(41,98,255,.07)', border: '1px solid rgba(41,98,255,.2)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            🔑 Demo account: <span className="font-semibold text-white">demo@example.com</span> / <span className="font-semibold text-white">password</span>
          </p>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center animate-fadeUp delay-300" style={{ fontSize: '.72rem', color: 'var(--color-dimmed)' }}>
          <Link to="/about" className="hover:underline" style={{ color: 'var(--color-muted)' }}>About Us</Link>
          <span className="mx-2">·</span>
          <Link to="/how-to-use" className="hover:underline" style={{ color: 'var(--color-muted)' }}>How to Use</Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:underline" style={{ color: 'var(--color-muted)' }}>Terms</Link>
          <span className="mx-2">·</span>
          <Link to="/disclaimer" className="hover:underline" style={{ color: 'var(--color-muted)' }}>Disclaimer</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
