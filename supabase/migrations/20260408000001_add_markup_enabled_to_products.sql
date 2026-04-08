-- Add markup_enabled column to products table
-- This allows admin to toggle +Rp1.000 markup per menu item
ALTER TABLE products ADD COLUMN IF NOT EXISTS markup_enabled BOOLEAN DEFAULT true;

-- Update existing products to have markup_enabled = true
UPDATE products SET markup_enabled = true WHERE markup_enabled IS NULL;
