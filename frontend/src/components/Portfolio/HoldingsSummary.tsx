import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export interface Holding {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
}

interface HoldingsSummaryProps {
  holdings: Holding[];
  cashBalance: number;
  currentPrices: Record<string, { ltp: number; prevClose: number }>;
  realizedPL: number;
  realizedCostBasis?: number;
}

export const HoldingsSummary: React.FC<HoldingsSummaryProps> = ({
  holdings,
  cashBalance,
  currentPrices,
  realizedPL,
  realizedCostBasis = 0,
}) => {
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);

  let currentValue = 0;
  let unrealizedPL = 0;

  holdings.forEach((h) => {
    const prices = currentPrices[h.symbol];
    const ltp = prices ? prices.ltp : h.avgBuyPrice;
    const value = h.quantity * ltp;
    currentValue += value;
    unrealizedPL += value - h.totalInvested;
  });

  const totalPL = realizedPL + unrealizedPL;
  const totalPortfolioValue = cashBalance + currentValue;

  const PortfolioCard = ({
    title,
    value,
    sub,
    positive,
    icon: Icon,
  }: {
    title: string;
    value: string;
    sub: string;
    positive: boolean;
    icon: any;
  }) => (
    <div className="card p-5 animate-fadeUp">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {title}
        </p>
        <div
          className={`p-2 rounded-lg ${
            positive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-xl font-bold text-white mb-1">{value}</p>
      <p className={`text-[11px] font-bold ${positive ? 'text-green-500' : 'text-red-500'}`}>
        {sub}
      </p>
    </div>
  );

  const totalPlPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const unrealizedPLPct = totalInvested > 0 ? (unrealizedPL / totalInvested) * 100 : 0;
  const realizedPLPct = realizedCostBasis > 0 ? (realizedPL / realizedCostBasis) * 100 : 0;

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <PortfolioCard
          title="Cash Balance"
          value={`Rs. ${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub="Available to trade"
          positive={true}
          icon={DollarSign}
        />
        <PortfolioCard
          title="Total Invested"
          value={`Rs. ${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub="Cost basis"
          positive={true}
          icon={DollarSign}
        />
        <PortfolioCard
          title="Current Value"
          value={`Rs. ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub="Market value of holdings"
          positive={currentValue >= totalInvested}
          icon={Activity}
        />
        <PortfolioCard
          title="Portfolio Value"
          value={`Rs. ${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub="Cash + Holdings"
          positive={true}
          icon={DollarSign}
        />
        <PortfolioCard
          title="Unrealized P&L"
          value={`Rs. ${unrealizedPL > 0 ? '+' : ''}${unrealizedPL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub={`${unrealizedPL > 0 ? '+' : ''}${unrealizedPLPct.toFixed(2)}% on holdings`}
          positive={unrealizedPL >= 0}
          icon={TrendingUp}
        />
        <PortfolioCard
          title="Realized P&L"
          value={`Rs. ${realizedPL > 0 ? '+' : ''}${realizedPL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub={`${realizedPL > 0 ? '+' : ''}${realizedPLPct.toFixed(2)}% from closed trades`}
          positive={realizedPL >= 0}
          icon={TrendingDown}
        />
        <PortfolioCard
          title="Total P&L"
          value={`Rs. ${totalPL > 0 ? '+' : ''}${totalPL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub={`${totalPL > 0 ? '+' : ''}${totalPlPct.toFixed(2)}% overall`}
          positive={totalPL >= 0}
          icon={Activity}
        />
      </div>
    </>
  );
};
