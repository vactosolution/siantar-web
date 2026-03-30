// Finance calculation constants
export const COST_PER_KM = 2000;
export const SERVICE_FEE = 2000;
export const DRIVER_SHARE_PERCENTAGE = 0.8; // 80%
export const ADMIN_SHARE_PERCENTAGE = 0.2; // 20%
export const MINIMUM_DISTANCE_KM = 1; // Minimum 1 km charge

export interface OrderFinance {
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  distance: number; // Actual distance
  chargedDistance: number; // Distance used for calculation (min 1 km)
  isMinimumChargeApplied: boolean; // Whether minimum charge was applied
  total: number;
  driverEarning: number;
  amountToStore: number;
  setoranToAdmin: number;
  adminProfit: number;
}

export function calculateOrderFinance(
  subtotal: number,
  distance: number
): OrderFinance {
  const serviceFee = SERVICE_FEE;
  
  // Apply minimum distance rule: if distance < 1 km, charge as 1 km
  const chargedDistance = Math.max(distance, MINIMUM_DISTANCE_KM);
  const isMinimumChargeApplied = distance < MINIMUM_DISTANCE_KM;
  
  // Delivery fee based on charged distance (minimum 1 km)
  // Formula: delivery_fee = max(distance, 1 km) × 2000
  const deliveryFee = chargedDistance * COST_PER_KM;
  
  // Driver gets 80% of delivery fee
  const driverEarning = deliveryFee * DRIVER_SHARE_PERCENTAGE;
  
  // Admin gets 20% of delivery fee + service fee
  const adminProfit = (deliveryFee * ADMIN_SHARE_PERCENTAGE) + serviceFee;
  
  const total = subtotal + serviceFee + deliveryFee;
  
  // Amount driver needs to pay to store
  const amountToStore = subtotal;
  
  // Amount driver must setor (transfer) to admin
  // Driver receives total from customer, pays store, keeps earning, setor the rest
  const setoranToAdmin = serviceFee + (deliveryFee * ADMIN_SHARE_PERCENTAGE);
  
  return {
    subtotal,
    serviceFee,
    deliveryFee,
    distance, // Actual distance
    chargedDistance, // Distance used for calculation
    isMinimumChargeApplied,
    total,
    driverEarning,
    amountToStore,
    setoranToAdmin,
    adminProfit,
  };
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

// Bonus calculation for drivers
export interface DriverBonus {
  dailyBonus: number;
  weeklyBonus: number;
  totalBonus: number;
}

export function calculateDriverBonus(
  dailyOrders: number,
  weeklyOrders: number
): DriverBonus {
  let dailyBonus = 0;
  
  if (dailyOrders >= 15) {
    dailyBonus = 30000;
  } else if (dailyOrders >= 10) {
    dailyBonus = 15000;
  } else if (dailyOrders >= 5) {
    dailyBonus = 5000;
  }
  
  const weeklyBonus = weeklyOrders >= 50 ? 50000 : 0;
  
  return {
    dailyBonus,
    weeklyBonus,
    totalBonus: dailyBonus + weeklyBonus,
  };
}