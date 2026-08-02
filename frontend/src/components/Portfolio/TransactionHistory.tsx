import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface Transaction {
  id: number;
  symbol: string;
  quantity: number;
  price: number;
  type: 'BUY' | 'SELL';
  createdAt: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading?: boolean;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  loading = false,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="card-header"><h3 className="card-title">Transaction History</h3></div>
        <div className="p-10 text-center text-gray-500">Loading transactions...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="card-header"><h3 className="card-title">Transaction History</h3></div>
        <div className="p-10 text-center text-gray-500">No transactions yet. Start trading to see your history.</div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header"><h3 className="card-title">Transaction History</h3></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Date</th>
              <th className="text-left">Type</th>
              <th className="text-left">Symbol</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Price</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const amount = tx.quantity * tx.price;
              const isBuy = tx.type === 'BUY';

              return (
                <tr key={tx.id}>
                  <td className="text-gray-400 text-sm">{formatDate(tx.createdAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1 rounded ${
                          isBuy ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}
                      >
                        {isBuy ? (
                          <TrendingUp className="text-green-500" size={16} />
                        ) : (
                          <TrendingDown className="text-red-500" size={16} />
                        )}
                      </div>
                      <span
                        className={`font-bold ${
                          isBuy ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </div>
                  </td>
                  <td className="font-bold text-white">{tx.symbol}</td>
                  <td className="text-right text-gray-300">{tx.quantity}</td>
                  <td className="text-right text-gray-400">
                    Rs. {tx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`text-right font-bold ${
                      isBuy ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {isBuy ? '-' : '+'}Rs.{' '}
                    {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
