import { ArrowLeft, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: '1rem', fontSize: '.8rem' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-gold), var(--color-red))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Scale className="w-7 h-7 text-white" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '.5rem' }}>Terms & Conditions</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '.85rem' }}>Last updated: May 2026</p>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {[
          {
            title: '1. Acceptance of Terms',
            content: 'By accessing and using NEPSE Pro, you agree to these terms. If you do not agree, do not use the platform.',
          },
          {
            title: '2. Educational Purpose',
            content: 'NEPSE Pro is a college project built for educational purposes. It provides real-time NEPSE data visualization but should NOT be considered financial advice.',
          },
          {
            title: '3. Data Accuracy',
            content: 'We fetch data from the NEPSE public API. While we strive for accuracy, we do not guarantee that the data is error-free or complete. Market data may be delayed.',
          },
          {
            title: '4. User Accounts',
            content: 'You are responsible for maintaining the confidentiality of your login credentials. You must provide accurate information during registration.',
          },
          {
            title: '5. No Financial Advice',
            content: 'NEPSE Pro does not provide investment, legal, or tax advice. All trading decisions are your own responsibility. Past performance does not guarantee future results.',
          },
          {
            title: '6. Limitation of Liability',
            content: 'We are not liable for any financial losses, data inaccuracies, or service interruptions. Use the platform at your own risk.',
          },
          {
            title: '7. Privacy',
            content: 'We store only essential user data (name, email, hashed password). We do not sell or share your personal information with third parties.',
          },
          {
            title: '8. Changes to Terms',
            content: 'We may update these terms at any time. Continued use after changes means you accept the updated terms.',
          },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom: i < 7 ? '1.25rem' : 0, paddingBottom: i < 7 ? '1.25rem' : 0, borderBottom: i < 7 ? '1px solid var(--color-border)' : 'none' }}>
            <p style={{ fontWeight: 700, color: '#fff', fontSize: '.85rem', marginBottom: '.3rem' }}>{s.title}</p>
            <p style={{ fontSize: '.8rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terms;
