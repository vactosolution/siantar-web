# Phase 7: Payment & Tracking Polish

## Overview

Phase 7 finalizes payment tracking features including the new "driver_assigned" order status, updated status labels across all panels, ETA calculation concept for outlet cards, and COD payment messaging.

## Files Created

None

## Files Modified

- Database: Order status constraint (added via migration in Phase 1)
- `src/app/pages/AdminPanel.tsx`
- `src/app/pages/DriverPanel.tsx`
- `src/app/pages/Home.tsx`
- `src/contexts/DataContext.tsx`

## Files Deleted

None

## Database Changes

### Order Status Constraint Update

Added `driver_assigned` to the allowed order status values:
```sql
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'completed', 'cancelled', 'driver_assigned'));
```

## Detailed Changes

### Status Labels Updated

All panels now include the new status label:
- `driver_assigned`: "Driver Ditugaskan"

Status labels are updated in:
- AdminPanel.tsx
- DriverPanel.tsx
- Customer order tracking views

### assignDriver Function

Updated to set order status to `driver_assigned` when a driver is assigned:
```typescript
const assignDriver = async (orderId: string, driverId: string) => {
  await supabase
    .from('orders')
    .update({ 
      driver_id: driverId,
      status: 'driver_assigned'
    })
    .eq('id', orderId);
};
```

### ETA Calculation Concept

Added to Home.tsx outlet cards:
- Displays estimated delivery time
- Based on distance and historical delivery data
- Format: "Estimasi ~X menit"

### COD Payment Message

Added "Mohon siapkan uang pas" (Please prepare exact change) message for Cash on Delivery orders:
- Shown during checkout for COD payment method
- Helps drivers by encouraging customers to prepare exact change
- Reduces change-related issues during delivery

## Notes

- The `driver_assigned` status bridges the gap between order confirmation and active delivery
- ETA calculation is a concept implementation and may need refinement based on real data
- COD messaging improves the delivery experience for both drivers and customers
