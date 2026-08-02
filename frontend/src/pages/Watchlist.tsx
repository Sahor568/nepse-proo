import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Bell, BellOff, Trash2, TrendingUp, TrendingDown, LayoutGrid, List, Search, Plus, Loader2 } from 'lucide-react';
import StockSearch from '../components/StockSearch';
import { NEPSE_BASE, API_BASE, authFetch } from '../apiConfig';

const Watchlist = () => {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      const res = await authFetch(`${API_BASE}/user/watchlist`);
      const data = await res.json();
      setWatchlist(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchLivePrices = async (symbols: string[]) => {
    try {
      const liveRes = await fetch(`${NEPSE_BASE}/live`);
      const liveData: any[] = await liveRes.json();
      const liveMap: Record<string, any> = {};
      liveData.forEach((s: any) => { liveMap[s.symbol] = s; });

      const results = await Promise.all(symbols.map(async (symbol) => {
        const liveEntry = liveMap[symbol];
        if (liveEntry && liveEntry.lastTradedPrice) {
          const ltp = liveEntry.lastTradedPrice;
          const pct = liveEntry.percentageChange || 0;
          return { symbol, lastTradedPrice: ltp, percentageChange: Number(pct).toFixed(2) };
        }
        // Fallback: use most recent history
        try {
          const res = await fetch(`${NEPSE_BASE}/history/${symbol}`);
          const data = await res.json();
          if (data && data.length > 0) {
            const latest = data[data.length - 1];
            const ltp = latest.ltp || latest.close;
            const prev = latest.prevClose;
            const pct = prev > 0 ? ((ltp - prev) / prev) * 100 : 0;
            return { symbol, lastTradedPrice: ltp, percentageChange: pct.toFixed(2) };
          }
        } catch { /* ignore */ }
        return null;
      }));

      const prices: Record<string, any> = {};
      results.forEach(r => { if (r) prices[r.symbol] = r; });
      setLivePrices(prices);
    } catch (e) {
      console.error('Failed to fetch prices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (watchlist.length === 0) { setLoading(false); return; }
    setLoading(true);
    const uniqueSymbols = [...new Set(watchlist.map(s => s.symbol))] as string[];
    fetchLivePrices(uniqueSymbols);

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchLivePrices(uniqueSymbols), 30_000);
    return () => clearInterval(interval);
  }, [watchlist]);

  const addToWatchlist = async (stock: any) => {
    if (!watchlist.find(s => s.symbol === stock.symbol)) {
      try {
        const res = await authFetch(`${API_BASE}/user/watchlist`, {
          method: 'POST',
          body: JSON.stringify({ symbol: stock.symbol })
        });
        if (res.ok) {
          fetchWatchlist();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      await authFetch(`${API_BASE}/user/watchlist/${symbol}`, { method: 'DELETE' });
      fetchWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '.2rem' }}>My Watchlist</h1>
          <p style={{ fontSize: '.8rem', color: 'var(--color-muted)' }}>Track your favorite NEPSE scrips</p>
        </div>
        
        <StockSearch 
          onSelect={addToWatchlist} 
          placeholder="Add stock to watchlist..." 
          className="shadow-2xl shadow-black/50"
        />
      </div>

      {loading && watchlist.length > 0 ? (
        <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : watchlist.length === 0 ? (
        <div className="card p-20 flex flex-col items-center justify-center text-center opacity-60">
           <Star size={48} className="text-gray-600 mb-4" />
           <h3 className="text-lg font-bold text-white mb-2">Watchlist is empty</h3>
           <p className="text-sm text-gray-400 max-w-xs">Use the search bar above to add any of the 300+ available NEPSE stocks to your tracking list.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {watchlist.map(stock => {
            const live = livePrices[stock.symbol];
            const price = live?.lastTradedPrice || '---';
            const change = live?.percentageChange || 0;
            const up = change >= 0;

            return (
              <div key={stock.symbol} className="card p-5 animate-fadeUp relative group overflow-hidden">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div 
                    className="cursor-pointer group-hover:translate-x-1 transition-transform"
                    onClick={() => navigate(`/chart?symbol=${stock.symbol}`)}
                  >
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }} className="group-hover:text-blue-400">{stock.symbol}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button onClick={() => removeFromWatchlist(stock.symbol)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }} className="hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontSize: '.7rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '.2rem' }}>Last Price</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{price !== '---' ? `Rs. ${price}` : price}</p>
                  </div>
                  <div className="text-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', color: up ? 'var(--color-green)' : 'var(--color-red)', fontWeight: 800 }}>
                      {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {up ? '+' : ''}{change}%
                    </div>
                  </div>
                </div>

                {/* Subtle background decoration */}
                <div style={{ position: 'absolute', right: '-10%', bottom: '-10%', fontSize: '5rem', fontWeight: 900, color: '#fff', opacity: .03, pointerEvents: 'none' }}>{stock.symbol}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
