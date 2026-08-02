import { Database } from 'sqlite';
import type { Transaction, Holding, TransactionType, PortfolioSummary, ChargeInfo, TradeQuote, RealizedPLMetrics } from '../types/portfolio.js';
import { calculateBuyCost, calculateSellProceeds } from '../utils/chargeCalculator.js';

interface PositionState {
  symbol: string;
  quantity: number;
  totalInvested: number;
  avgBuyPrice: number;
  avgPurchaseDateMs: number;
}

interface PortfolioState {
  holdings: Holding[];
  realizedPL: number;
  realizedCostBasis: number;
  realizedProceeds: number;
}

export class PortfolioService {
  constructor(private db: Database) {}

  /**
   * Get user's cash balance
   */
  async getCashBalance(userId: number): Promise<number> {
    const user = await this.db.get(
      'SELECT cashBalance FROM users WHERE id = ?',
      [userId]
    );
    return user?.cashBalance ?? 100000;
  }

  /**
   * Update user's cash balance
   */
  async setCashBalance(userId: number, amount: number): Promise<boolean> {
    if (amount < 0) throw new Error('Cash balance cannot be negative');
    
    await this.db.run(
      'UPDATE users SET cashBalance = ? WHERE id = ?',
      [amount, userId]
    );
    return true;
  }

  /**
   * Get all transactions for a user
   */
  async getTransactions(userId: number, order: 'ASC' | 'DESC' = 'DESC'): Promise<Transaction[]> {
    const sortDirection = order === 'ASC' ? 'ASC' : 'DESC';
    return this.db.all(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY datetime(createdAt) ${sortDirection}, id ${sortDirection}`,
      [userId]
    );
  }

  private buildPortfolioState(transactions: Transaction[]): PortfolioState {
    const positions = new Map<string, PositionState>();
    let realizedPL = 0;
    let realizedCostBasis = 0;
    let realizedProceeds = 0;

    for (const tx of transactions) {
      const symbol = tx.symbol.toUpperCase();
      const txTimestamp = new Date(tx.createdAt).getTime();
      let position = positions.get(symbol);

      if (!position) {
        position = {
          symbol,
          quantity: 0,
          totalInvested: 0,
          avgBuyPrice: 0,
          avgPurchaseDateMs: txTimestamp,
        };
      }

      if (tx.type === 'BUY') {
        const previousQuantity = position.quantity;
        const previousInvested = position.totalInvested;
        const newQuantity = previousQuantity + tx.quantity;
        const newInvested = previousInvested + tx.quantity * tx.price;

        position.quantity = newQuantity;
        position.totalInvested = newInvested;
        position.avgBuyPrice = newQuantity > 0 ? newInvested / newQuantity : 0;
        position.avgPurchaseDateMs = newQuantity > 0
          ? ((position.avgPurchaseDateMs * previousQuantity) + (txTimestamp * tx.quantity)) / newQuantity
          : txTimestamp;
      } else {
        if (position.quantity < tx.quantity) {
          throw new Error(`Transaction history is inconsistent for ${symbol}: sold ${tx.quantity}, only ${position.quantity} held.`);
        }

        const soldCostBasis = position.avgBuyPrice * tx.quantity;
        const purchaseDate = new Date(position.avgPurchaseDateMs);
        const saleDate = new Date(txTimestamp);
        const saleAmount = tx.quantity * tx.price;
        const breakdown = calculateSellProceeds(saleAmount, soldCostBasis, purchaseDate, saleDate);

        realizedCostBasis += soldCostBasis;
        realizedProceeds += breakdown.finalAmount;
        realizedPL += breakdown.finalAmount - soldCostBasis;

        const remainingQuantity = position.quantity - tx.quantity;
        position.quantity = remainingQuantity;
        position.totalInvested = remainingQuantity * position.avgBuyPrice;

        if (position.quantity < -1e-8 || position.totalInvested < -1e-8) {
          throw new Error(`Negative position detected for ${symbol}.`);
        }

        if (remainingQuantity === 0) {
          positions.delete(symbol);
          continue;
        }
      }

      positions.set(symbol, position);
    }

    const holdings = Array.from(positions.values())
      .map((position) => ({
        symbol: position.symbol,
        quantity: position.quantity,
        avgBuyPrice: position.avgBuyPrice,
        totalInvested: position.totalInvested,
        avgPurchaseDate: new Date(position.avgPurchaseDateMs).toISOString(),
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    const totalInvested = holdings.reduce((sum, holding) => sum + holding.totalInvested, 0);
    if (totalInvested < -1e-8) {
      throw new Error('Portfolio cost basis cannot be negative.');
    }

    return {
      holdings,
      realizedPL,
      realizedCostBasis,
      realizedProceeds,
    };
  }

  /**
   * Get a trade quote with all charges calculated
   */
  async getTradeQuote(
    userId: number,
    symbol: string,
    quantity: number,
    price: number,
    type: TransactionType
  ): Promise<TradeQuote> {
    const subtotal = quantity * price;
    const cashBalance = await this.getCashBalance(userId);
    let charges: ChargeInfo;
    let total: number;
    let projectedBalance: number;

    if (type === 'BUY') {
      const breakdown = calculateBuyCost(subtotal);
      charges = {
        brokerCommission: breakdown.brokerCommission,
        sebonFee: breakdown.sebonFee,
        dpCharge: breakdown.dpCharge,
        capitalGainsTax: 0,
        totalCharges: breakdown.totalCost,
      };
      total = breakdown.finalAmount;
      projectedBalance = cashBalance - total;
    } else {
      // For sell, we need to find the holding info for CGT
      const holdings = await this.getHoldings(userId);
      const holding = holdings.find((h) => h.symbol === symbol);

      if (!holding) {
        throw new Error(`No holding found for ${symbol}`);
      }

      // Estimate purchase date - use current date for now
      // In production, you'd track actual purchase dates per share lot
      const purchaseDate = holding.avgPurchaseDate
        ? new Date(holding.avgPurchaseDate)
        : new Date();
      const saleDate = new Date();

      const soldCostBasis = holding.avgBuyPrice * quantity;
      const breakdown = calculateSellProceeds(subtotal, soldCostBasis, purchaseDate, saleDate);
      charges = {
        brokerCommission: breakdown.brokerCommission,
        sebonFee: breakdown.sebonFee,
        dpCharge: breakdown.dpCharge,
        capitalGainsTax: breakdown.capitalGainsTax,
        totalCharges: breakdown.totalCost,
      };
      total = breakdown.finalAmount;
      projectedBalance = cashBalance + total;
    }

    return {
      type,
      symbol,
      quantity,
      price,
      subtotal,
      charges,
      total,
      projectedBalance,
    };
  }

  /**
   * Execute a trade (buy or sell)
   */
  async executeTrade(
    userId: number,
    symbol: string,
    quantity: number,
    price: number,
    type: TransactionType
  ): Promise<Transaction> {
    if (quantity <= 0) throw new Error('Quantity must be greater than 0');
    if (price <= 0) throw new Error('Price must be greater than 0');

    const cashBalance = await this.getCashBalance(userId);
    const quote = await this.getTradeQuote(userId, symbol, quantity, price, type);

    if (type === 'BUY') {
      if (cashBalance < quote.total) {
        throw new Error(
          `Insufficient balance. Required: Rs. ${quote.total.toFixed(2)}, Available: Rs. ${cashBalance.toFixed(2)}`
        );
      }
      await this.setCashBalance(userId, quote.projectedBalance);
    } else if (type === 'SELL') {
      const holdings = await this.getHoldings(userId);
      const holding = holdings.find((h) => h.symbol === symbol);
      if (!holding || holding.quantity < quantity) {
        const available = holding?.quantity ?? 0;
        throw new Error(
          `Insufficient shares. Available: ${available}, Requested: ${quantity}`
        );
      }
      await this.setCashBalance(userId, quote.projectedBalance);
    }

    const result = await this.db.run(
      'INSERT INTO transactions (user_id, symbol, quantity, price, type) VALUES (?, ?, ?, ?, ?)',
      [userId, symbol.toUpperCase(), quantity, price, type]
    );

    return {
      id: result.lastID!,
      user_id: userId,
      symbol: symbol.toUpperCase(),
      quantity,
      price,
      type,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Calculate holdings from all transactions
   */
  async getHoldings(userId: number): Promise<Holding[]> {
    const transactions = await this.getTransactions(userId, 'ASC');
    return this.buildPortfolioState(transactions).holdings;
  }

  /**
   * Calculate realized P&L and the sold cost basis (from all completed trades)
   */
  async getRealizedMetrics(userId: number): Promise<RealizedPLMetrics> {
    const transactions = await this.getTransactions(userId, 'ASC');
    const state = this.buildPortfolioState(transactions);

    return {
      realizedPL: state.realizedPL,
      realizedCostBasis: state.realizedCostBasis,
      realizedProceeds: state.realizedProceeds,
    };
  }

  async getRealizedPL(userId: number): Promise<number> {
    const metrics = await this.getRealizedMetrics(userId);
    return metrics.realizedPL;
  }

  /**
   * Get complete portfolio summary
   */
  async getPortfolioSummary(userId: number): Promise<PortfolioSummary> {
    const cashBalance = await this.getCashBalance(userId);
    const holdings = await this.getHoldings(userId);
    const transactions = await this.getTransactions(userId);
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);

    return {
      cashBalance,
      totalInvested,
      holdings,
      transactions
    };
  }
}
