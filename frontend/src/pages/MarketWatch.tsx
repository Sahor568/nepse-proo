import React, { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Activity, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NEPSE_BASE } from '../apiConfig';

type SortKey = 'lastTradedPrice' | 'percentageChange' | 'totalTradeQuantity' | 'symbol';
type SortDir = 'asc' | 'desc';

const MarketWatch = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalTradeQuantity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [watchlist, setWatchlist] = useState<string[]>(() => JSON.parse(localStorage.getItem('watchlist') || '[]'));

  useEffect(() => {
    fetch(`${NEPSE_BASE}/live`)
      .then(res => res.json())
      .then(data => { setStocks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };
  
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline ml-0.5" /> : <ChevronUp className="w-3 h-3 inline ml-0.5" />) : null;

  const filtered = useMemo(() =>
    stocks
      .filter(s =>
        (s.symbol.toLowerCase().includes(search.toLowerCase()) || s.securityName.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        const mul = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * mul;
        return ((a as any)[sortKey] - (b as any)[sortKey]) * mul;
      }), [stocks, search, sortKey, sortDir]);

  const toggleWatch = (sym: string) =>
    setWatchlist(w => w.includes(sym) ? w.filter(s => s !== sym) : [...w, sym]);

  if (loading) {
    return <div className="h-full flex flex-col items-center justify-center text-blue-500 gap-4"><Loader2 className="animate-spin" size={42} /> <p className="text-gray-400">Loading Market Data...</p></div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '.2rem' }}>Market Watch</h1>
          <p style={{ fontSize: '.78rem', color: 'var(--color-muted)' }}>
            Real-time feed for {stocks.length} scrips
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 300px' }}>
          <Search style={{ position: 'absolute', left: '.65rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }}
            placeholder="Search symbol or company name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left" onClick={() => toggleSort('symbol')} style={{ cursor: 'pointer' }}>Symbol <SortIcon k="symbol" /></th>
              <th className="text-left">Company</th>
              <th className="text-right" onClick={() => toggleSort('lastTradedPrice')} style={{ cursor: 'pointer' }}>LTP <SortIcon k="lastTradedPrice" /></th>
              <th className="text-right">High</th>
              <th className="text-right">Low</th>
              <th className="text-right" onClick={() => toggleSort('percentageChange')} style={{ cursor: 'pointer' }}>% Chg <SortIcon k="percentageChange" /></th>
              <th className="text-right" onClick={() => toggleSort('totalTradeQuantity')} style={{ cursor: 'pointer' }}>Qty <SortIcon k="totalTradeQuantity" /></th>
              <th className="text-right">Watch</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const up = row.percentageChange >= 0;
              return (
                <tr key={row.symbol}>
                  <td>
                    <button 
                      onClick={() => navigate(`/chart?symbol=${row.symbol}`)}
                      className="hover:underline text-left"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '.9rem', color: '#fff' }}>{row.symbol}</span>
                    </button>
                  </td>
                  <td><span style={{ color: 'var(--color-muted)', fontSize: '.75rem', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.securityName}</span></td>
                  <td className="text-right"><span style={{ fontWeight: 700, color: '#fff' }}>{row.lastTradedPrice}</span></td>
                  <td className="text-right" style={{ color: 'var(--color-green)', fontSize: '.78rem' }}>{row.highPrice}</td>
                  <td className="text-right" style={{ color: 'var(--color-red)', fontSize: '.78rem' }}>{row.lowPrice}</td>
                  <td className="text-right">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontWeight: 800, fontSize: '.8rem', color: up ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {up ? '+' : ''}{row.percentageChange}%
                    </span>
                  </td>
                  <td className="text-right" style={{ color: 'var(--color-muted)', fontSize: '.78rem' }}>{row.totalTradeQuantity?.toLocaleString()}</td>
                  <td className="text-right">
                    <button onClick={() => toggleWatch(row.symbol)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: watchlist.includes(row.symbol) ? 'var(--color-gold)' : 'var(--color-border)', transition: 'color .15s' }}>
                      <Star className="w-4 h-4" fill={watchlist.includes(row.symbol) ? 'var(--color-gold)' : 'none'} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketWatch;
