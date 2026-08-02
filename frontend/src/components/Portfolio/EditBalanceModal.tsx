import React, { useState } from 'react';
import { X } from 'lucide-react';

interface EditBalanceModalProps {
  isOpen: boolean;
  currentBalance: number;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
}

export const EditBalanceModal: React.FC<EditBalanceModalProps> = ({
  isOpen,
  currentBalance,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState(currentBalance.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount)) {
      setError('Please enter a valid number');
      return;
    }

    if (numAmount < 0) {
      setError('Balance cannot be negative');
      return;
    }

    setLoading(true);
    try {
      await onSave(numAmount);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update balance');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Edit Cash Balance</h2>
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
              New Balance (NPR)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter amount"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Current balance: Rs. {currentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>

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
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
