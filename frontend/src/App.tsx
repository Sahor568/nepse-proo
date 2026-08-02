import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import PublicHeader from './components/PublicHeader';
import Dashboard from './pages/Dashboard';
import ChartPage from './pages/ChartPage';
import MarketWatch from './pages/MarketWatch';
import Portfolio from './pages/Portfolio';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Watchlist from './pages/Watchlist';
import Profile from './pages/Profile';
import GoogleCallback from './pages/auth/GoogleCallback';
import About from './pages/About';
import HowToUse from './pages/HowToUse';
import Terms from './pages/Terms';
import Disclaimer from './pages/Disclaimer';



const isAuth = () => !!localStorage.getItem('token');

const Guard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isGuest = localStorage.getItem('guest') === 'true';
  if (isAuth()) {
    return <>{children}</>;
  }
  if (isGuest && (location.pathname === '/dashboard' || location.pathname === '/')) {
    return <>{children}</>;
  }
  return <Navigate to={isGuest ? '/signup' : '/login'} replace />;
};

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
    <PublicHeader />
    <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />
        <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/how-to-use" element={<PublicLayout><HowToUse /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
        <Route path="/disclaimer" element={<PublicLayout><Disclaimer /></PublicLayout>} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chart"     element={<ChartPage />} />
          <Route path="market"    element={<MarketWatch />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="profile"   element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
