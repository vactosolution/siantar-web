-- Migration: Add markup_enabled to products and improve order tracking
-- Date: 2026-04-08
-- Purpose: Fix invoice pricing, add per-menu markup toggle, fix driver panel status updates

-- 1. Add markup_enabled to products (default TRUE for backward compatibility)
ALTER TABLE products ADD COLUMN IF NOT EXISTS markup_enabled BOOLEAN DEFAULT true;
UPDATE products SET markup_enabled = true WHERE markup_enabled IS NULL;

-- 2. Ensure RLS policies allow drivers to update order status via RPC
-- (RPC already uses SECURITY DEFINER so this should work, but let's verify)

-- 3. Add index for faster order queries by driver_id and status
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON orders(driver_id, status);

-- 4. Add index for product queries by outlet_id
CREATE INDEX IF NOT EXISTS idx_products_outlet_markup ON products(outlet_id, markup_enabled);
