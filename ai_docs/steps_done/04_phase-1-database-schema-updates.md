# Phase 1: Database Schema Updates

## Overview

Phase 1 focuses on updating the Supabase database schema to support new features including banners, notifications, driver financial tracking, and product recommendations. All changes were applied via migrations to ensure version control and reproducibility.

## Files Created

- `supabase/migrations/20250401_create_banners.sql`
- `supabase/migrations/20250402_create_notifications.sql`
- `supabase/migrations/20250403_create_driver_financial_transactions.sql`
- `supabase/migrations/20250404_add_product_recommendation_columns.sql`
- `supaverse/migrations/20250405_add_profile_driver_columns.sql`
- `supabase/migrations/20250406_create_update_driver balance RPC.sql`
- `supabase/migrations/20250407_update_order_status_constraint.sql`
- `src/database.types.ts` (updated)

## Files Modified

- `src/database.types.ts` - Added TypeScript type definitions for new tables and updated existing types

## Files Deleted

None

## Database Changes

### Tables Created

#### `banners`
```sql
CREATE TABLE banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `notifications`
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `driver_financial_transactions`
```sql
CREATE TABLE driver_financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earning', 'withdrawal', 'deposit')),
  description TEXT,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Columns Added

#### `products` table
- `is_best_seller` BOOLEAN DEFAULT false
- `is_recommended` BOOLEAN DEFAULT false

#### `profiles` table
- `photo_url` TEXT
- `is_online` BOOLEAN DEFAULT false

### RPC Function Created

#### `update_driver_balance`
```sql
CREATE OR REPLACE FUNCTION update_driver_balance(driver_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET balance = balance + amount
  WHERE id = driver_id AND role = 'driver';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Constraint Updates

#### Order status constraint
Added `driver_assigned` to the allowed order status values:
```sql
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'completed', 'cancelled', 'driver_assigned'));
```

### Initial Driver Deposit

New drivers receive an initial deposit of Rp 100.000 upon registration:
```sql
INSERT INTO driver_financial_transactions (driver_id, amount, type, description)
VALUES (new_driver_id, 100000, 'deposit', 'Saldo awal driver');
```

## Detailed Changes

### database.types.ts Updates

Added new TypeScript type definitions for:

- `Database["public"]["Tables"]["banners"]` - Banner table schema
- `Database["public"]["Tables"]["notifications"]` - Notification table schema
- `Database["public"]["Tables"]["driver_financial_transactions"]` - Driver financial transactions schema
- Updated `Database["public"]["Tables"]["products"]["Row"]` with `is_best_seller` and `is_recommended` fields
- Updated `Database["public"]["Tables"]["profiles"]["Row"]` with `photo_url` and `is_online` fields

## Notes

- All migrations are idempotent where possible
- RLS policies should be added for new tables in a follow-up migration
- The `update_driver_balance` RPC function uses `SECURITY DEFINER` to bypass RLS policies
- Driver balance initial deposit is handled via trigger on profile creation
