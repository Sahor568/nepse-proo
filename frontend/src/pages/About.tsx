import { Users, GraduationCap, Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const team = [
  {
    name: 'Shishir Devkota',
    role: 'Developer / Designer & Team Lead',
    desc: 'Full-stack development, UI/UX design, NEPSE API integration, chart implementation, and deployment coordination.',
    img: '/sishir.png', // <-- Points to frontend/public/shishir.png
  },
  {
    name: 'Raghav Panthi',
    role: 'Developer / Designer / project idea innovator',
    desc: 'Frontend development, authentication flow, database schema design, and visual component building, QA and testing.',
    img: '/raghav.png',  // <-- Points to frontend/public/raghav.png
  },
  {
    name: 'Suprabha Mainali',
    role: 'Documentation & Research',
    desc: 'Project documentation, NEPSE market research, data analysis, user manual, and presentation materials.',
    img: '/suprabha.png', // <-- Points to frontend/public/suprabha.png
  },
];


const thanks = [
  {
    name: 'Sumant Yadav',
    role: 'Supervisor',
    desc: 'For continuous guidance, project direction, and valuable feedback throughout the development process.',
    img: '/sumantsir.png',
  },
  {
    name: 'Abhishranta Aryal',
    role: 'Motivator & Guide',
    desc: 'For constant encouragement, technical insights, and keeping the team motivated during challenging phases.',
    img: 'https://ui-avatars.com/api/?name=Abhishranta+Aryal&background=F23645&color=fff&size=100&bold=true',
  },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: '1rem', fontSize: '.8rem' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-blue), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Users className="w-7 h-7 text-white" />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '.5rem' }}>About Us</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '.9rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          NEPSE Pro is a <strong>6th semester college project</strong> built by students of <strong>SchEMS College</strong>.
          We wanted to create a simple, real-time NEPSE stock tracking platform for Nepali investors.
        </p>
      </div>

      {/* College Info */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <GraduationCap className="w-10 h-10" style={{ color: 'var(--color-blue)' }} />
        <div>
          <p style={{ fontWeight: 700, color: '#fff', fontSize: '.95rem' }}>SchEMS College, 6th Semester Project</p>
          <p style={{ fontSize: '.8rem', color: 'var(--color-muted)' }}>BSc.CSIT | 2025–2026 | NEPSE Pro: Real-time Stock Market Visualizer</p>
        </div>
      </div>

      {/* Team Section */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Team Members</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {team.map((m, i) => (
          <div key={i} className="card animate-fadeUp" style={{ animationDelay: `${i * 0.1}s`, padding: '1.5rem', textAlign: 'center' }}>
            <img src={m.img} alt={m.name} style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 1rem', display: 'block', border: '3px solid var(--color-border)', objectFit: 'cover' }} />
            <p style={{ fontWeight: 800, color: '#fff', fontSize: '.95rem' }}>{m.name}</p>
            <p style={{ fontSize: '.75rem', color: 'var(--color-blue)', fontWeight: 600, marginBottom: '.6rem' }}>{m.role}</p>
            <p style={{ fontSize: '.78rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Thanks Section */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <Heart className="w-5 h-5" style={{ color: 'var(--color-red)' }} /> Special Thanks
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {thanks.map((m, i) => (
          <div key={i} className="card animate-fadeUp" style={{ animationDelay: `${i * 0.1 + 0.3}s`, padding: '1.5rem', textAlign: 'center', borderTop: '3px solid var(--color-gold)' }}>
            <img src={m.img} alt={m.name} style={{ width: 130, height: 130, borderRadius: '50%', margin: '0 auto 1rem', display: 'block', border: '3px solid var(--color-gold)', objectFit: 'cover' }} />
            <p style={{ fontWeight: 800, color: '#fff', fontSize: '.9rem' }}>{m.name}</p>
            <p style={{ fontSize: '.75rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: '.6rem' }}>{m.role}</p>
            <p style={{ fontSize: '.78rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>{m.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-dimmed)', fontSize: '.75rem', borderTop: '1px solid var(--color-border)' }}>
        Made with 💙 by Team NEPSE Pro | <a href="https://www.schems.edu.np/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blue)', textDecoration: 'underline' }}>SchEMS College</a>
      </div>
    </div>
  );
};

export default About;
