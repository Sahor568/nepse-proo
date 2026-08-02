import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { NEPSE_BASE } from '../apiConfig';

interface StockSearchProps {
  onSelect: (stock: any) => void;
  placeholder?: string;
  className?: string;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelect, placeholder = 'Search all NEPSE stocks...', className = '' }) => {
  const [query, setQuery] = useState('');
  const [stocks, setStocks] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${NEPSE_BASE}/securities`)
      .then(res => res.json())
      .then(data => {
        setStocks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return stocks.filter(s => 
      s.symbol.toLowerCase().includes(q) || 
      s.securityName.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [stocks, query]);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ minWidth: 280 }}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          type="text"
          className="input w-full pl-10 pr-10"
          placeholder={placeholder}
          value={query}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
        />
        {query && (
          <button 
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (query.length > 0 || loading) && (
        <div className="absolute top-full left-0 w-full mt-2 bg-panel border border-border rounded-xl shadow-2xl z-[100] overflow-hidden animate-fadeUp">
          {loading ? (
            <div className="p-4 flex items-center justify-center text-blue-500 gap-2">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-xs font-semibold">Loading scrips...</span>
            </div>
          ) : filtered.length > 0 ? (
            <div className="max-h-60 overflow-y-auto p-1">
              {filtered.map(s => (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    setQuery('');
                    setShowDropdown(false);
                  }}
                  className="w-full text-left p-3 hover:bg-blue-600/10 rounded-lg transition-colors group border border-transparent hover:border-blue-500/30"
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-white group-hover:text-blue-400">{s.symbol}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.instrumentType?.description || 'Equity'}</span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">{s.securityName}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-gray-500 font-medium">No scrips found for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSearch;
