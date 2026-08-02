import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { LayoutDashboard, LineChart, Activity, Briefcase, Star, Settings, Search, Bell, LogOut, Menu, X, ChevronDown, Users, BookOpen } from 'lucide-react';
import { NEPSE_BASE } from '../apiConfig';
import HeaderNotifications from './HeaderNotifications';

const navLinks = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/chart',     icon: LineChart,       label: 'Pro Charts' },
  { path: '/market',    icon: Activity,        label: 'Market Watch' },
  { path: '/portfolio', icon: Briefcase,       label: 'Portfolio' },
  { path: '/watchlist', icon: Star,            label: 'Watchlist' },
];

const Layout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [indices, setIndices] = useState<any[]>([]);
  const [ticker, setTicker] = useState<any[]>([]);
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const isAuthenticated = !!localStorage.getItem('token');
  const restrictedPaths = ['/chart', '/portfolio', '/watchlist', '/profile'];
  const initials = (user?.name || 'JD').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const logout = () => { localStorage.clear(); navigate('/login'); };

  useEffect(() => {
    const fetchTicker = async () => {
        try {
            const [idxRes, gainRes] = await Promise.all([
                fetch(`${NEPSE_BASE}/index`),
                fetch(`${NEPSE_BASE}/gainers`)
            ]);
            setIndices(await idxRes.json());
            setTicker(await gainRes.json());
        } catch(e) {}
    };
    fetchTicker();
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, []);

  const mainIndex = indices.find(i => i.index === 'NEPSE Index');
  const mainIndexValue = mainIndex?.currentValue ?? mainIndex?.close;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-[240px] bg-panel border-r border-border flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-14 flex items-center px-5 border-b border-border gap-3">
            <img src="/nepseprologo.png" alt="NEPSE Pro" className="w-8 h-8" />
            <div className="flex-1">
                <div className="font-bold text-white text-sm">NEPSE PRO</div>
                <div className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">Live Terminal</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500"><X size={18} /></button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-surface/50 border border-border">
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-900/20">{initials}</div>
             <div className="flex-1 min-w-0">
               <div className="text-sm font-bold text-white truncate">{user?.name || 'Trader'}</div>
               <div className="text-[10px] text-green-500 font-bold">● Active</div>
             </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={(e) => {
                if (!isAuthenticated && restrictedPaths.includes(path)) {
                  e.preventDefault();
                  alert('Create an account to access this feature.');
                  navigate('/signup');
                } else {
                  setSidebarOpen(false);
                }
              }}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="pt-4 mt-4 border-t border-border">
             <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
               <Settings size={18} /> <span>Settings</span>
             </NavLink>
          </div>
          <div className="pt-2 border-t border-border mt-2">
             <NavLink to="/about" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
               <Users size={18} /> <span>About Us</span>
             </NavLink>
             <NavLink to="/how-to-use" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
               <BookOpen size={18} /> <span>How to Use</span>
             </NavLink>
          </div>
        </nav>

        <div className="p-3 border-t border-border">
            {isAuthenticated ? (
                <button onClick={logout} className="nav-item w-full text-red-500 hover:bg-red-500/10 hover:border-red-500/20">
                  <LogOut size={18} /> <span>Sign Out</span>
                </button>
            ) : (
                <button onClick={() => navigate('/login')} className="nav-item w-full text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/20">
                  <LogOut size={18} /> <span>Sign In</span>
                </button>
            )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-panel border-b border-border flex items-center px-4 gap-4 flex-shrink-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400"><Menu size={20} /></button>

          {/* Index Ticker Strip */}
          <div className="hidden lg:flex items-center flex-1 gap-6 overflow-hidden">
             {ticker.slice(0, 5).map(t => (
                 <div key={t.symbol} className="flex items-center gap-2 whitespace-nowrap animate-fadeIn">
                     <span className="text-[11px] font-bold text-gray-300">{t.symbol}</span>
                     <span className={`text-[11px] font-bold ${t.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {t.ltp} ({t.percentageChange >= 0 ? '+' : ''}{t.percentageChange}%)
                     </span>
                 </div>
             ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
             {mainIndex && (
                 <div className="hidden sm:flex flex-col items-end">
                     <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">NEPSE Index</div>
                     <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{mainIndexValue?.toLocaleString?.() ?? mainIndexValue}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${mainIndex.change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {mainIndex.change >= 0 ? '▲' : '▼'} {Math.abs(mainIndex.perChange)}%
                        </span>
                     </div>
                 </div>
             )}
             <div className="w-px h-6 bg-border" />
             <div className="hidden md:flex items-center gap-1">
                <NavLink to="/about" className="text-[11px] font-medium px-2 py-1 rounded transition-colors" style={({ isActive }) => ({ color: isActive ? 'var(--color-blue)' : 'var(--color-muted)', background: isActive ? 'rgba(41,98,255,.1)' : 'transparent', textDecoration: 'none' })}>About</NavLink>
                <NavLink to="/how-to-use" className="text-[11px] font-medium px-2 py-1 rounded transition-colors" style={({ isActive }) => ({ color: isActive ? 'var(--color-blue)' : 'var(--color-muted)', background: isActive ? 'rgba(41,98,255,.1)' : 'transparent', textDecoration: 'none' })}>Guide</NavLink>
                <NavLink to="/terms" className="text-[11px] font-medium px-2 py-1 rounded transition-colors hidden lg:inline" style={({ isActive }) => ({ color: isActive ? 'var(--color-blue)' : 'var(--color-muted)', background: isActive ? 'rgba(41,98,255,.1)' : 'transparent', textDecoration: 'none' })}>Terms</NavLink>
                <NavLink to="/disclaimer" className="text-[11px] font-medium px-2 py-1 rounded transition-colors hidden lg:inline" style={({ isActive }) => ({ color: isActive ? 'var(--color-blue)' : 'var(--color-muted)', background: isActive ? 'rgba(41,98,255,.1)' : 'transparent', textDecoration: 'none' })}>Disc.</NavLink>
             </div>
             <div className="w-px h-6 bg-border" />
             <HeaderNotifications mainIndex={mainIndex} ticker={ticker} />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-bg relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
