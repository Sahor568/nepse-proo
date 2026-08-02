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
