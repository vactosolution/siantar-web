# Phase 6: Driver Panel Enhancements

## Overview

Phase 6 enhances the driver panel with WhatsApp customer contact, balance-gated order acceptance, confirmation dialogs for all status changes, and logout confirmation.

## Files Created

None

## Files Modified

- `src/app/pages/DriverPanel.tsx`

## Files Deleted

None

## Database Changes

None

## Detailed Changes

### DriverPanel.tsx

**New Imports:**
- Added `MessageCircle` icon from lucide-react for WhatsApp button
- Added `ConfirmDialog` component import

**New State:**
- `showLogoutConfirm` - Controls logout confirmation dialog visibility
- `confirmAction` - Stores pending status change action for confirmation dialogs

**WhatsApp Button for Customer Contact:**
- Added WhatsApp contact button in order list view
- Added WhatsApp contact button in active order detail view
- Opens WhatsApp with pre-filled message including order ID
- Format: `https://wa.me/{phone}?text={message}`

**Block Order Acceptance When Balance < MIN_BALANCE:**
- Defined `MIN_BALANCE = 30000` (Rp 30.000)
- Prevents driver from accepting new orders when balance is below minimum
- Shows error message explaining the balance requirement
- Ensures driver has sufficient balance for operational costs

**Confirmation Dialogs for Status Changes:**
All status transitions now require confirmation:
- `Menuju Toko` (Heading to Store)
- `Ambil Pesanan` (Pick Up Order)
- `Mulai Pengiriman` (Start Delivery)
- `Selesaikan Pengiriman` (Complete Delivery)

Each status change shows a ConfirmDialog with:
- Title describing the action
- Description of what will happen
- Confirm/Cancel buttons

**Logout Confirmation Dialog:**
- Replaced direct logout with ConfirmDialog
- Prevents accidental logouts
- Shows "Apakah Anda yakin ingin keluar?" message

## Notes

- MIN_BALANCE constant is set to 30000 (Rp 30.000)
- WhatsApp integration uses the wa.me API
- All confirmation dialogs use the same ConfirmDialog component pattern
- Status change confirmations help prevent accidental order state transitions
