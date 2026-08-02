export interface ChargeBreakdown {
  transactionAmount: number;
  brokerCommission: number;
  sebonFee: number;
  dpCharge: number;
  capitalGainsTax: number;
  totalCost: number;
  finalAmount: number;
}

/**
 * Calculate broker commission based on NEPSE tier structure
 */
export function calculateBrokerCommission(amount: number): number {
  if (amount <= 50000) return amount * 0.0036;
  if (amount <= 500000) return amount * 0.0033;
  if (amount <= 2000000) return amount * 0.0031;
  if (amount <= 10000000) return amount * 0.0027;
  return amount * 0.0024;
}

/**
 * Calculate SEBON fee (0.015% of transaction amount)
 */
export function calculateSebonFee(amount: number): number {
  return amount * 0.00015; // 0.015% = 0.00015
}

/**
 * DP (Depository Participant) charge - fixed Rs. 25 per sell transaction
 */
export const DP_CHARGE = 25;

/**
 * Calculate capital gains tax on profit (applicable only when selling)
 * 7.5% if held less than 1 year
 * 5% if held more than 1 year
 */
export function calculateCapitalGainsTax(
  profit: number,
  purchaseDate: Date,
  saleDate: Date
): number {
  if (profit <= 0) return 0; // No tax on loss or zero profit

  const daysDifference = Math.floor(
    (saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const taxRate = daysDifference < 365 ? 0.075 : 0.05;

  return profit * taxRate;
}

/**
 * Calculate total buy cost including brokerage and SEBON fee.
 * DP charge applies on sell transactions only.
 */
export function calculateBuyCost(amount: number): ChargeBreakdown {
  const brokerCommission = calculateBrokerCommission(amount);
  const sebonFee = calculateSebonFee(amount);
  const dpCharge = 0;
  const totalCost = brokerCommission + sebonFee;
  const finalAmount = amount + totalCost;

  return {
    transactionAmount: amount,
    brokerCommission,
    sebonFee,
    dpCharge,
    capitalGainsTax: 0,
    totalCost,
    finalAmount,
  };
}

/**
 * Calculate net proceeds from selling shares
 * Includes charges and capital gains tax
 */
export function calculateSellProceeds(
  saleAmount: number,
  purchaseCost: number,
  purchaseDate: Date,
  saleDate: Date
): ChargeBreakdown {
  const brokerCommission = calculateBrokerCommission(saleAmount);
  const sebonFee = calculateSebonFee(saleAmount);
  const dpCharge = DP_CHARGE;

  const profit = saleAmount - purchaseCost;
  const capitalGainsTax = calculateCapitalGainsTax(profit, purchaseDate, saleDate);

  const totalCost = brokerCommission + sebonFee + dpCharge + capitalGainsTax;
  const finalAmount = saleAmount - totalCost;

  return {
    transactionAmount: saleAmount,
    brokerCommission,
    sebonFee,
    dpCharge,
    capitalGainsTax,
    totalCost,
    finalAmount,
  };
}
