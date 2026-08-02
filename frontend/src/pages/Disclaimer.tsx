import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Disclaimer = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: '1rem', fontSize: '.8rem' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-red), var(--color-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '.5rem' }}>Disclaimer</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '.85rem' }}>Last updated: May 2026</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--color-red)' }}>
        <p style={{ fontWeight: 700, color: 'var(--color-red)', fontSize: '.85rem', marginBottom: '.5rem' }}>⚠️ Important Notice</p>
        <p style={{ fontSize: '.8rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>
          NEPSE Pro is a <strong>student college project</strong> created for educational purposes only.
          It is NOT a licensed financial platform, broker, or advisory service.
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {[
          {
            title: 'Not Financial Advice',
            content: 'The data, charts, and information provided on NEPSE Pro are for informational and educational purposes only. Nothing on this platform constitutes financial, investment, or trading advice.',
          },
          {
            title: 'Data Source',
            content: 'Stock market data is sourced from the NEPSE public API. We do not guarantee the accuracy, completeness, or timeliness of any data displayed. Data may be delayed or contain errors.',
          },
          {
            title: 'No Guarantee of Availability',
            content: 'We do not guarantee that the service will be uninterrupted, secure, or error-free. The platform may be taken down after the college project evaluation period.',
          },
          {
            title: 'Investment Risk',
            content: 'Trading in stocks carries significant financial risk. You should consult a qualified financial advisor before making any investment decisions. Never invest money you cannot afford to lose.',
          },
          {
            title: 'Third-Party Links',
            content: 'The platform may contain links to third-party websites. We are not responsible for the content, privacy practices, or accuracy of those sites.',
          },
          {
            title: 'College Project Status',
            content: 'This platform is developed as part of a 6th semester BCA project at SchEMS College. It is not a commercial product and may contain bugs or incomplete features.',
          },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom: i < 5 ? '1.25rem' : 0, paddingBottom: i < 5 ? '1.25rem' : 0, borderBottom: i < 5 ? '1px solid var(--color-border)' : 'none' }}>
            <p style={{ fontWeight: 700, color: '#fff', fontSize: '.85rem', marginBottom: '.3rem' }}>{s.title}</p>
            <p style={{ fontSize: '.8rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Disclaimer;
