import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { API_BASE, authFetch } from '../../apiConfig';

export type TradeType = 'BUY' | 'SELL';

interface ChargeInfo {
  brokerCommission: number;
  sebonFee: number;
  dpCharge: number;
  capitalGainsTax: number;
  totalCharges: number;
}

interface TradeQuote {
  type: TradeType;
  symbol: string;
  quantity: number;
  price: number;
  subtotal: number;
  charges: ChargeInfo;
  total: number;
  projectedBalance: number;
}

interface TradeFormModalProps {
  isOpen: boolean;
  symbol: string;
  tradeType: TradeType;
  maxQuantity: number;
  cashBalance: number;
  onClose: () => void;
  onSubmit: (quantity: number, price: number, type: TradeType) => Promise<void>;
}

export const TradeFormModal: React.FC<TradeFormModalProps> = ({
  isOpen,
  symbol,
  tradeType,
  maxQuantity,
  cashBalance,
  onClose,
  onSubmit,
}) => {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<TradeQuote | null>(null);

  // Fetch trade quote whenever quantity or price changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!quantity || !price) {
        setQuote(null);
        return;
      }

      const qty = parseFloat(quantity);
      const priceVal = parseFloat(price);

      if (isNaN(qty) || qty <= 0 || isNaN(priceVal) || priceVal <= 0) {
        setQuote(null);
        return;
      }

      try {
        const res = await authFetch(`${API_BASE}/user/trade-quote`, {
          method: 'POST',
          body: JSON.stringify({
            symbol,
            quantity: qty,
            price: priceVal,
            type: tradeType,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setQuote(data);
        }
      } catch (err) {
        console.error('Failed to fetch quote:', err);
      }
    };

    fetchQuote();
  }, [quantity, price, symbol, tradeType]);

  const handleSubmit = async () => {
    setError('');
    const qty = parseFloat(quantity);
    const priceVal = parseFloat(price);

    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (isNaN(priceVal) || priceVal <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (tradeType === 'SELL' && qty > maxQuantity) {
      setError(`Cannot sell more than ${maxQuantity} shares`);
      return;
    }

    if (quote && tradeType === 'BUY' && quote.projectedBalance < 0) {
      setError(
        `Insufficient balance. Need: Rs. ${quote.total.toFixed(2)}, Available: Rs. ${cashBalance.toFixed(2)}`
      );
      return;
    }

    setLoading(true);
    try {
      await onSubmit(qty, priceVal, tradeType);
      setQuantity('');
      setPrice('');
      setQuote(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    quantity && price && (!quote || (tradeType === 'BUY' ? quote.projectedBalance >= 0 : parseFloat(quantity) <= maxQuantity));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h2 className="text-lg font-bold text-white">
            {tradeType === 'BUY' ? 'Buy' : 'Sell'} {symbol}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter quantity"
              disabled={loading}
            />
            {tradeType === 'SELL' && (
              <p className="text-xs text-gray-500 mt-1">
                Available: {maxQuantity} shares
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price per share (NPR)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter price"
              disabled={loading}
            />
          </div>

          {/* Quote Breakdown */}
          {quote && (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white font-medium">
                  Rs. {quote.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="border-t border-gray-700 pt-2 space-y-1">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Charges:</p>
                
                {quote.charges.brokerCommission > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Broker Commission ({tradeType === 'BUY' ? '0.33-0.36%' : '0.33-0.36%'}):</span>
                    <span>Rs. {quote.charges.brokerCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {quote.charges.sebonFee > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>SEBON Fee (0.015%):</span>
                    <span>Rs. {quote.charges.sebonFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {quote.charges.dpCharge > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>DP Charge:</span>
                    <span>Rs. {quote.charges.dpCharge.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {quote.charges.capitalGainsTax > 0 && (
                  <div className="flex justify-between text-xs text-orange-400">
                    <span>Capital Gains Tax (5-7.5%):</span>
                    <span>Rs. {quote.charges.capitalGainsTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="font-semibold text-gray-300">Total Charges:</span>
                <span className="text-red-400 font-bold">
                  Rs. {quote.charges.totalCharges.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-gray-900/50 rounded p-2 flex justify-between border border-gray-600">
                <span className="font-semibold text-white">
                  {tradeType === 'BUY' ? 'Total Cost' : 'Net Proceeds'}:
                </span>
                <span
                  className={`font-bold ${tradeType === 'BUY' ? 'text-red-400' : 'text-green-400'}`}
                >
                  Rs. {quote.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  {tradeType === 'BUY' ? 'Balance after buy' : 'Balance after sell'}:
                </p>
                <p
                  className={`text-sm font-bold ${
                    quote.projectedBalance >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  Rs. {quote.projectedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !isValid}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-white font-medium ${
                tradeType === 'BUY'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : tradeType === 'BUY' ? 'Buy' : 'Sell'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

