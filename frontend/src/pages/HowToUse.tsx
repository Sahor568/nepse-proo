import { ArrowLeft, UserPlus, LogIn, Search, Star, Briefcase, LineChart, Bell, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    icon: UserPlus,
    title: '1. Sign Up / Login',
    desc: 'Create an account using your email and password, or log in instantly with Google OAuth. Verify your email with the OTP sent to your inbox.',
  },
  {
    icon: Search,
    title: '2. Explore Market Watch',
    desc: 'Browse real-time NEPSE data including gainers, losers, turnover, and live stock prices. Use the search bar to find specific companies.',
  },
  {
    icon: Star,
    title: '3. Build Your Watchlist',
    desc: 'Add your favorite stocks to the watchlist for quick access. Monitor price movements without searching every time.',
  },
  {
    icon: LineChart,
    title: '4. Use Pro Charts',
    desc: 'Click any symbol to open an interactive chart. View candlestick patterns, intraday data, and 1-year historical trends with volume analysis.',
  },
  {
    icon: Briefcase,
    title: '5. Manage Portfolio',
    desc: 'Track your investments by adding stocks with quantity, buy price, and date. See your profit/loss in real-time.',
  },
  {
    icon: Bell,
    title: '6. Stay Updated',
    desc: 'The header ticker shows live NEPSE index values and top movers. Notifications keep you informed of market changes.',
  },
];

const HowToUse = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: '1rem', fontSize: '.8rem' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-blue), #089981)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Eye className="w-7 h-7 text-white" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '.5rem' }}>How to Use NEPSE Pro</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '.85rem' }}>A simple guide to get started with the platform</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {steps.map((s, i) => (
          <div key={i} className="card animate-fadeUp" style={{ animationDelay: `${i * 0.08}s`, padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(41,98,255,.1)', border: '1px solid rgba(41,98,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon className="w-5 h-5" style={{ color: 'var(--color-blue)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: '.9rem', marginBottom: '.3rem' }}>{s.title}</p>
              <p style={{ fontSize: '.8rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginTop: '2rem', background: 'rgba(8,153,129,.05)', borderColor: 'rgba(8,153,129,.2)' }}>
        <p style={{ fontWeight: 700, color: 'var(--color-green)', fontSize: '.85rem', marginBottom: '.3rem' }}>💡 Tip</p>
        <p style={{ fontSize: '.8rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>
          All data is fetched live from the NEPSE API. Market data refreshes every 60 seconds.
          Charts support zoom and pan — hover over candles for detailed price info.
        </p>
      </div>

      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-dimmed)', fontSize: '.75rem' }}>
        Need help? Contact the team from the About page.
      </div>
    </div>
  );
};

export default HowToUse;
