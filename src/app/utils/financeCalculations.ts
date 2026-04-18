// Finance calculation constants (defaults, overridden by fee_settings from DB)
export const DEFAULT_COST_PER_KM = 2000;
export const DEFAULT_SERVICE_FEE = 0;
export const DEFAULT_ADMIN_FEE = 0;
export const DEFAULT_DRIVER_SHARE_PCT = 80;
export const DEFAULT_ADMIN_SHARE_PCT = 20;
export const DEFAULT_MIN_DISTANCE_KM = 1;

export interface FeeSettings {
  cost_per_km: number;
  service_fee: number;
  admin_fee: number;
  driver_share_pct: number;
  admin_share_pct: number;
  min_distance_km: number;
}

export function getDefaultFeeSettings(): FeeSettings {
  return {
    cost_per_km: DEFAULT_COST_PER_KM,
    service_fee: DEFAULT_SERVICE_FEE,
    admin_fee: DEFAULT_ADMIN_FEE,
    driver_share_pct: DEFAULT_DRIVER_SHARE_PCT,
    admin_share_pct: DEFAULT_ADMIN_SHARE_PCT,
    min_distance_km: DEFAULT_MIN_DISTANCE_KM,
  };
}

export interface OrderFinance {
  subtotal: number;
  adminFee: number;
  serviceFee: number;
  deliveryFee: number;
  distance: number;
  chargedDistance: number;
  isMinimumChargeApplied: boolean;
  total: number;
  driverEarning: number;
  amountToStore: number;
  setoranToAdmin: number;
  adminProfit: number;
  zone?: "Hijau" | "Kuning" | "Merah" | "Manual";
  zoneFee?: number;
}

/**
 * Calculates straight-line distance between two coordinates in KM using Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place
}

export function calculateOrderFinance(
  subtotal: number, // This should be the marked-up subtotal (store_price + 1000) * qty
  distance: number,
  markupAmount: number = 0, // Explicitly passed markup total
  fees: FeeSettings = getDefaultFeeSettings()
): OrderFinance {
  let deliveryFee = 0;
  let zone: "Hijau" | "Kuning" | "Merah" | "Manual" | undefined = undefined;
  let zoneFee = 0;

  // Logic Ongkir Zona (Fitur #55)
  // Ongkir = Biaya Zona + (Jarak × Rp2.000)
  if (distance <= 3) {
    zone = "Hijau";
    zoneFee = 5000;
  } else if (distance <= 5) {
    zone = "Kuning";
    zoneFee = 10000;
  } else {
    zone = "Merah";
    zoneFee = 15000;
  }
  deliveryFee = zoneFee + (distance * fees.cost_per_km);

  const chargedDistance = Math.max(distance, fees.min_distance_km);
  const isMinimumChargeApplied = distance < fees.min_distance_km;
  
  const driverSharePct = fees.driver_share_pct / 100;
  const adminSharePct = fees.admin_share_pct / 100;
  
  const driverEarning = deliveryFee * driverSharePct;
  const adminFromDelivery = deliveryFee * adminSharePct;

  // New logic: markup is passed down explicitly (since toggle can be OFF)
  const itemMarkupTotal = markupAmount;
  const adminFee = 0; // Legacy admin fee is removed
  const serviceFee = 0; // Legacy service fee is removed

  const adminProfit = adminFromDelivery + itemMarkupTotal;
  const total = subtotal + deliveryFee; // Subtotal already heavily includes the markup

  // Amount to store is raw total minus the app markup
  const amountToStore = subtotal - itemMarkupTotal;
  const setoranToAdmin = adminFromDelivery + itemMarkupTotal;

  return {
    subtotal,
    adminFee,
    serviceFee,
    deliveryFee,
    distance,
    chargedDistance,
    isMinimumChargeApplied,
    total,
    driverEarning,
    amountToStore,
    setoranToAdmin,
    adminProfit,
    zone,
    zoneFee,
  };
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export interface DriverBonus {
  dailyBonus: number;
  weeklyBonus: number;
  totalBonus: number;
}

export function calculateDriverBonus(
  dailyOrders: number,
  _weeklyOrders: number = 0
): DriverBonus {
  // New bonus scheme (per day):
  // 10 orders  → Rp5.000
  // 15 orders  → Rp7.000
  // 20 orders  → Rp10.000
  // 30+ orders → Rp15.000
  let dailyBonus = 0;
  if (dailyOrders >= 30) dailyBonus = 15000;
  else if (dailyOrders >= 20) dailyBonus = 10000;
  else if (dailyOrders >= 15) dailyBonus = 7000;
  else if (dailyOrders >= 10) dailyBonus = 5000;

  return { dailyBonus, weeklyBonus: 0, totalBonus: dailyBonus };
}

// Generate 3-digit unique payment code (100-999)
// Ensures the code is not already used in existingOrders
export function generateUniquePaymentCode(existingOrderCodes: number[] = []): number {
  const maxAttempts = 100;
  for (let i = 0; i < maxAttempts; i++) {
    const code = Math.floor(100 + Math.random() * 900); // 100-999
    if (!existingOrderCodes.includes(code)) {
      return code;
    }
  }
  // Fallback: use timestamp-based code if all attempts fail
  return 100 + (Date.now() % 900);
}
