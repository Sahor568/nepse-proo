import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, MailCheck, BarChart2 } from 'lucide-react';
import { AUTH_BASE } from '../../apiConfig';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'email_verify'>('form');
  const [userId, setUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    fullName: '', email: '', mobile: '', password: '', confirmPassword: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [resending, setResending] = useState(false);

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE}/signup/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          mobile: formData.mobile,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }
      setUserId(data.userId);
      setStep('email_verify');
      setResendTimer(60);
      if (data.devOtp) {
        localStorage.setItem('lastDevOtp', data.devOtp);
        alert(`Your OTP is: ${data.devOtp}\n\n(For testing only - check backend terminal or email)`);
      }
    } catch (err) {
      setError('Unable to connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setter(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number, setter: React.Dispatch<React.SetStateAction<string[]>>, currentOtp: string[]) => {
    if (e.key === 'Backspace' && !currentOtp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
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
    if (resendTimer > 0) return;
    setResending(true);
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
      setResending(false);
    }
  };

  if (step === 'email_verify') {
    return (
      <div className="min-h-screen flex items-center justify-center py-10 relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        <div className="orb w-80 h-80 top-0 left-0 opacity-15" style={{ background: 'var(--color-green)' }} />
        <div className="orb w-96 h-96 bottom-0 right-0 opacity-10" style={{ background: 'var(--color-blue)' }} />
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
          <div className="card glow-green animate-fadeUp delay-100">
            <div className="p-7 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(34,197,94,.15)' }}>
                <MailCheck className="w-8 h-8" style={{ color: '#22c55e' }} />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Verify Your Email</h1>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
                We've sent a 6-digit code to<br />
                <span className="font-semibold text-white">{formData.email}</span>
              </p>
              {typeof window !== 'undefined' && (
                <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)' }}>
                  <span style={{ color: '#22c55e' }}>DEV: </span>
                  <span className="font-bold text-white">Code: {typeof window !== 'undefined' ? localStorage.getItem('lastDevOtp') || '' : ''}</span>
                </div>
              )}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(242,54,69,.1)', border: '1px solid rgba(242,54,69,.3)', color: 'var(--color-red)' }}>
                  {error}
                </div>
              )}
              <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, i, setOtp)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i, setOtp, otp)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-lg border text-white"
                    style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)' }}
                  />
                ))}
              </div>
              <button onClick={verifyEmailOtp} disabled={loading}
                className="btn btn-green w-full py-2.5 mb-4">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify Email'}
              </button>
              <button onClick={resendEmailOtp} disabled={resending || resendTimer > 0}
                className="text-sm hover:underline" style={{ color: 'var(--color-muted)' }}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : resending ? 'Sending...' : "Didn't receive code? Resend"}
              </button>
              <p className="mt-6 text-xs" style={{ color: 'var(--color-dimmed)' }}>
                Already verified? <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-green)' }}>Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-10 relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <div className="orb w-80 h-80 top-0 left-0 opacity-15" style={{ background: 'var(--color-green)' }} />
      <div className="orb w-96 h-96 bottom-0 right-0 opacity-10" style={{ background: 'var(--color-blue)' }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-8 animate-fadeUp">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(8,153,129,.15)', border: '1px solid rgba(8,153,129,.3)' }}>
              <BarChart2 className="w-5 h-5" style={{ color: 'var(--color-green)' }} />
            </div>
            <div>
              <div className="text-lg font-bold text-white tracking-wide">NEPSE Pro</div>
              <div className="text-[10px] font-medium tracking-[0.15em] uppercase" style={{ color: 'var(--color-muted)' }}>Trading Terminal</div>
            </div>
          </div>
        </div>
        <div className="card glow-green animate-fadeUp delay-100">
          <div className="p-7">
            <h1 className="text-xl font-bold text-white mb-1">Create Account</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>Join Nepal's premier stock tracking platform</p>
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium animate-fadeIn"
                style={{ background: 'rgba(242,54,69,.1)', border: '1px solid rgba(242,54,69,.3)', color: 'var(--color-red)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                  <input id="signup-name" type="text" className="input icon-left" placeholder="Hari Prasad Sharma"
                    value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                  <input id="signup-email" type="email" className="input icon-left" placeholder="hari@example.com"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Mobile <span style={{ color: 'var(--color-dimmed)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 rounded-lg border text-sm font-semibold"
                    style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)', color: 'var(--color-text)', minWidth: '72px' }}>
                    🇳🇵 +977
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                    <input id="signup-mobile" type="tel" className="input icon-left w-full" placeholder="98XXXXXXXX"
                      value={formData.mobile} maxLength={10}
                      onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                  <input id="signup-password" type={showPw ? 'text' : 'password'} className="input icon-left pr-10" placeholder="Min 6 characters"
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                  <input id="signup-confirm-password" type={showCPw ? 'text' : 'password'} className="input icon-left pr-10" placeholder="Repeat password"
                    value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowCPw(!showCPw)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                    {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button id="signup-submit" type="submit" disabled={loading} className="btn btn-green w-full py-2.5 mt-2">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Create Account <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
            <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-green)' }}>Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;