import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Briefcase, Edit2, DollarSign, TrendingUp, TrendingDown, Loader2, ShoppingCart, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import StockSearch from '../components/StockSearch';
import { NEPSE_BASE, API_BASE, authFetch } from '../apiConfig';
import { EditBalanceModal } from '../components/Portfolio/EditBalanceModal';
import { TradeFormModal, type TradeType } from '../components/Portfolio/TradeFormModal';
import { TransactionHistory, type Transaction } from '../components/Portfolio/TransactionHistory';
import { HoldingsSummary, type Holding } from '../components/Portfolio/HoldingsSummary';

const Portfolio = () => {
  const navigate = useNavigate();
  
  // State
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [realizedPL, setRealizedPL] = useState(0);
  const [realizedCostBasis, setRealizedCostBasis] = useState(0);
  const [stockStats, setStockStats] = useState<Record<string, { ltp: number; prevClose: number }>>({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showEditBalance, setShowEditBalance] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [tradeType, setTradeType] = useState<TradeType>('BUY');

  // Load portfolio data
  const loadPortfolioData = async () => {
    try {
      const [balanceRes, holdingsRes, transactionsRes, realizedRes] = await Promise.all([
        authFetch(`${API_BASE}/user/cash-balance`),
        authFetch(`${API_BASE}/user/holdings`),
        authFetch(`${API_BASE}/user/transactions`),
        authFetch(`${API_BASE}/user/realized-pl`),
      ]);

      const balanceData = await balanceRes.json();
      const holdingsData = await holdingsRes.json();
      const transactionsData = await transactionsRes.json();
      const realizedData = await realizedRes.json();

      setCashBalance(balanceData.cashBalance);
      setHoldings(holdingsData);
      setTransactions(transactionsData);
      setRealizedPL(realizedData.realizedPL);
      setRealizedCostBasis(realizedData.realizedCostBasis ?? 0);
    } catch (err) {
      console.error('Error loading portfolio:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadPortfolioData();
  }, []);

  // Fetch live prices
  const fetchLivePrices = async (symbols: string[]) => {
    try {
      const liveRes = await fetch(`${NEPSE_BASE}/live`);
      const liveData: any[] = await liveRes.json();
      const liveMap: Record<string, any> = {};
      liveData.forEach((s: any) => {
        liveMap[s.symbol] = s;
      });

      const results = await Promise.all(
        symbols.map(async (symbol) => {
          const liveEntry = liveMap[symbol];
          if (liveEntry && liveEntry.lastTradedPrice) {
            return {
              symbol,
              ltp: liveEntry.lastTradedPrice,
              prevClose:
                liveEntry.lastTradedPrice /
                (1 + (liveEntry.percentageChange || 0) / 100),
            };
          }
          try {
            const res = await fetch(`${NEPSE_BASE}/history/${symbol}`);
            const data = await res.json();
            if (data && data.length > 0) {
              const latest = data[data.length - 1];
              return {
                symbol,
                ltp: latest.ltp || latest.close,
                prevClose: latest.prevClose,
              };
            }
          } catch {}
          return null;
        })
      );

      const stats: Record<string, { ltp: number; prevClose: number }> = {};
      results.forEach((r) => {
        if (r) stats[r.symbol] = { ltp: r.ltp, prevClose: r.prevClose };
      });
      setStockStats(stats);
    } catch (e) {
      console.error('Failed to fetch prices:', e);
    } finally {
      setLoading(false);
    }
  };

  // Update prices when holdings change
  useEffect(() => {
    if (holdings.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const uniqueSymbols = [...new Set(holdings.map((h) => h.symbol))] as string[];
    fetchLivePrices(uniqueSymbols);

    // Auto-refresh prices every 30 seconds
    const interval = setInterval(() => fetchLivePrices(uniqueSymbols), 30_000);
    return () => clearInterval(interval);
  }, [holdings]);

  // Update cash balance
  const handleUpdateBalance = async (newAmount: number) => {
    try {
      const res = await authFetch(`${API_BASE}/user/cash-balance`, {
        method: 'PUT',
        body: JSON.stringify({ amount: newAmount }),
      });
      if (res.ok) {
        setCashBalance(newAmount);
      }
    } catch (err) {
      console.error('Error updating balance:', err);
      throw err;
    }
  };

  // Execute trade
  const handleTrade = async (quantity: number, price: number, type: TradeType) => {
    try {
      const res = await authFetch(`${API_BASE}/user/trade`, {
        method: 'POST',
        body: JSON.stringify({
          symbol: selectedSymbol,
          quantity,
          price,
          type,
        }),
      });

      if (res.ok) {
        // Reload portfolio data
        await loadPortfolioData();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Trade failed');
      }
    } catch (err) {
      console.error('Error executing trade:', err);
      throw err;
    }
  };

  // Open trade modal
  const openTradeModal = (symbol: string, type: TradeType) => {
    setSelectedSymbol(symbol);
    setTradeType(type);
    setShowTradeForm(true);
  };

  // Add holding from search
  const addHolding = (stock: any) => {
    openTradeModal(stock.symbol, 'BUY');
  };

  // Calculate metrics
  const maxSharesForSell = selectedSymbol
    ? holdings.find((h) => h.symbol === selectedSymbol)?.quantity ?? 0
    : 0;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Modals */}
      <EditBalanceModal
        isOpen={showEditBalance}
        currentBalance={cashBalance}
        onClose={() => setShowEditBalance(false)}
        onSave={handleUpdateBalance}
      />
      <TradeFormModal
        isOpen={showTradeForm}
        symbol={selectedSymbol}
        tradeType={tradeType}
        maxQuantity={maxSharesForSell}
        cashBalance={cashBalance}
        onClose={() => setShowTradeForm(false)}
        onSubmit={handleTrade}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '.2rem' }}>
            Virtual Trading Portfolio
          </h1>
          <p style={{ fontSize: '.8rem', color: 'var(--color-muted)' }}>
            Paper trading system for NEPSE stocks
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowEditBalance(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DollarSign size={16} />
            Edit Balance
          </button>
          <StockSearch onSelect={addHolding} placeholder="Add to portfolio..." />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <>
          {/* Holdings Summary */}
          <HoldingsSummary
            holdings={holdings}
            cashBalance={cashBalance}
            currentPrices={stockStats}
            realizedPL={realizedPL}
            realizedCostBasis={realizedCostBasis}
          />

          {/* Holdings Table */}
          <div className="card overflow-hidden mb-6">
            <div className="card-header">
              <h3 className="card-title">Current Holdings</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Symbol</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Avg Buy Price</th>
                    <th className="text-right">Current Price</th>
                    <th className="text-right">Invested</th>
                    <th className="text-right">Current Value</th>
                    <th className="text-right">Unrealized P&L</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const stats = stockStats[h.symbol];
                    const ltp = stats ? stats.ltp : h.avgBuyPrice;
                    const currentValue = h.quantity * ltp;
                    const unrealizedPL = currentValue - h.totalInvested;
                    const unrealizedPLPct =
                      h.totalInvested > 0
                        ? (unrealizedPL / h.totalInvested) * 100
                        : 0;

                    return (
                      <tr key={h.symbol}>
                        <td>
                          <button
                            onClick={() => navigate(`/chart?symbol=${h.symbol}`)}
                            className="font-bold text-white hover:text-blue-400 text-left transition-colors cursor-pointer bg-transparent border-none p-0"
                          >
                            {h.symbol}
                          </button>
                        </td>
                        <td className="text-right font-bold text-gray-200">
                          {h.quantity}
                        </td>
                        <td className="text-right text-gray-400">
                          Rs. {h.avgBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right text-white font-bold">
                          Rs. {ltp.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right text-gray-400">
                          Rs.{' '}
                          {h.totalInvested.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right font-bold text-white">
                          Rs.{' '}
                          {currentValue.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`text-right font-bold ${
                            unrealizedPL >= 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          <div>
                            {unrealizedPL >= 0 ? '+' : ''}
                            {unrealizedPL.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-[10px]">
                            {unrealizedPL >= 0 ? '+' : ''}
                            {unrealizedPLPct.toFixed(2)}%
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openTradeModal(h.symbol, 'BUY')}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-semibold hover:bg-green-500/20 hover:border-green-500/50 transition-colors"
                              title="Buy more"
                            >
                              <ArrowDownLeft size={16} />
                              Buy
                            </button>
                            <button
                              onClick={() => openTradeModal(h.symbol, 'SELL')}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                              title="Sell"
                            >
                              <ArrowUpRight size={16} />
                              Sell
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {holdings.length === 0 && !loading && (
                <div className="p-20 text-center opacity-40">
                  <Briefcase size={40} className="mx-auto mb-3" />
                  <p className="text-sm font-medium">
                    No holdings yet. Buy stocks using the search bar or trade form.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <TransactionHistory transactions={transactions} loading={loading} />
        </>
      )}
    </div>
  );
};

export default Portfolio;
