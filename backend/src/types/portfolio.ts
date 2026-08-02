export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: number;
  user_id: number;
  symbol: string;
  quantity: number;
  price: number;
  type: TransactionType;
  createdAt: string;
}

export interface ChargeInfo {
  brokerCommission: number;
  sebonFee: number;
  dpCharge: number;
  capitalGainsTax: number;
  totalCharges: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  avgPurchaseDate?: string; // For capital gains tax calculation
}

export interface PortfolioSummary {
  cashBalance: number;
  totalInvested: number;
  holdings: Holding[];
  transactions: Transaction[];
}

export interface RealizedPLMetrics {
  realizedPL: number;
  realizedCostBasis: number;
  realizedProceeds: number;
}

export interface PriceData {
  ltp: number;
  prevClose: number;
}

export interface HoldingWithMetrics extends Holding {
  currentPrice?: number;
  currentValue?: number;
  unrealizedPL?: number;
  unrealizedPLPct?: number;
}

export interface TradeQuote {
  type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  subtotal: number;
  charges: ChargeInfo;
  total: number;
  projectedBalance: number;
}
