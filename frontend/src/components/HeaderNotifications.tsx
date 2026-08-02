import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Briefcase, Activity, AlertCircle, PieChart, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { NEPSE_BASE, API_BASE, authFetch } from '../apiConfig';

const HeaderNotifications = ({ mainIndex, ticker }: { mainIndex: any, ticker: any[] }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mainIndexValue = mainIndex?.currentValue ?? mainIndex?.close;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  const generateNotifications = async () => {
    setLoading(true);
    const newAlerts: any[] = [];
    
    // 1. AI Market News (Heuristic based)
    if (mainIndex) {
      const isUp = mainIndex.change >= 0;
      const title = isUp ? "Market is Bullish Today" : "Market Faces Downturn";
      const desc = `NEPSE Index is at ${mainIndexValue?.toLocaleString?.() ?? mainIndexValue}, ${isUp ? 'up' : 'down'} ${Math.abs(mainIndex.change)} points (${Math.abs(mainIndex.perChange)}%). ${ticker && ticker.length > 0 ? `Top mover: ${ticker[0]?.symbol} at ${ticker[0]?.percentageChange}%.` : ''}`;
      
      newAlerts.push({
        id: 'market-news',
        title: title,
        message: desc,
        icon: isUp ? ArrowUpRight : ArrowDownRight,
        color: isUp ? 'text-green-500' : 'text-red-500',
        bg: isUp ? 'bg-green-500/10' : 'bg-red-500/10',
        time: 'Just now',
        symbol: ticker && ticker.length > 0 ? ticker[0]?.symbol : null
      });
    }

    // 2. Portfolio Summary
    try {
      const pRes = await authFetch(`${API_BASE}/user/portfolio`);
      const portfolio = await pRes.json();
      
      if (portfolio && portfolio.length > 0) {
        // Calculate P&L
        let currentValue = 0;
        let invested = 0;
        let todayGain = 0;

        const uniqueSymbols = [...new Set(portfolio.map((h: any) => h.symbol))] as string[];
        const stats: Record<string, any> = {};

        // Fetch all live prices in one call
        try {
          const liveRes = await fetch(`${NEPSE_BASE}/live`);
          const liveData: any[] = await liveRes.json();
          liveData.forEach((s: any) => {
            if (uniqueSymbols.includes(s.symbol) && s.lastTradedPrice) {
              const pct = s.percentageChange || 0;
              const ltp = s.lastTradedPrice;
              const prevClose = ltp / (1 + pct / 100);
              stats[s.symbol] = { ltp, prevClose };
            }
          });
        } catch { /* ignore */ }

        // For any still-missing symbols, fall back to history
        await Promise.all(uniqueSymbols.filter(sym => !stats[sym]).map(async (symbol) => {
           try {
             const res = await fetch(`${NEPSE_BASE}/history/${symbol}`);
             const data = await res.json();
             if (data && data.length > 0) {
                const latest = data[data.length - 1];
                stats[symbol] = { ltp: latest.ltp || latest.close, prevClose: latest.prevClose };
             }
           } catch { /* ignore */ }
        }));

        portfolio.forEach((h: any) => {
           const s = stats[h.symbol];
           const ltp = s ? s.ltp : h.buy_price;
           const prevClose = s ? s.prevClose : ltp;
           
           invested += (h.quantity * h.buy_price);
           currentValue += (h.quantity * ltp);
           todayGain += (h.quantity * (ltp - prevClose));
        });

        const totalPL = currentValue - invested;
        
        newAlerts.push({
          id: 'portfolio-summary',
          title: "Daily Portfolio Summary",
          message: `Your portfolio is ${todayGain >= 0 ? 'up' : 'down'} Rs. ${Math.abs(todayGain).toLocaleString()} today. Total P&L stands at Rs. ${totalPL.toLocaleString()}.`,
          icon: Briefcase,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          time: 'Today'
        });
      }
    } catch (e) {
      console.error(e);
    }

    setNotifications(newAlerts);
    setLoading(false);
  };

  useEffect(() => {
    if (open && notifications.length === 0) {
      generateNotifications();
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="p-2 text-gray-400 hover:text-white relative transition-colors">
        <Bell size={18} />
        {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-panel" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-panel border border-border shadow-2xl rounded-xl overflow-hidden z-50 animate-fadeUp">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-surface/50">
            <h3 className="font-bold text-white text-sm">Notifications</h3>
            <button onClick={() => { generateNotifications(); }} className="text-[10px] text-blue-400 hover:text-blue-300">Refresh</button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-xs flex justify-center items-center gap-2">
                 <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                 Analyzing Market Data...
              </div>
            ) : notifications.length > 0 ? (
              <div className="flex flex-col">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div 
                      key={n.id} 
                      className="p-4 border-b border-border/50 hover:bg-surface/30 transition-colors flex gap-3 items-start cursor-pointer group"
                      onClick={() => {
                        if (n.symbol) navigate(`/chart?symbol=${n.symbol}`);
                        else if (n.id === 'portfolio-summary') navigate('/portfolio');
                        setOpen(false);
                      }}
                    >
                      <div className={`p-2 rounded-lg ${n.bg} flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${n.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                          <span className="text-[9px] text-gray-500 whitespace-nowrap ml-2">{n.time}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-xs">
                <Bell className="w-8 h-8 opacity-20 mx-auto mb-2" />
                No new notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderNotifications;
