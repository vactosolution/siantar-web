# Phase 3: Real-time Infrastructure

## Overview

Phase 3 introduces real-time data synchronization across the application using Supabase Realtime subscriptions. This ensures that orders, products, outlets, profiles, and notifications are updated instantly without manual page refreshes.

## Files Created

- `src/lib/realtime.ts` - Realtime subscription helper functions

## Files Modified

- `src/contexts/DataContext.tsx` - Added realtime subscriptions for data tables
- `src/contexts/NotificationContext.tsx` - Added database notification integration with realtime

## Files Deleted

None

## Database Changes

None (relies on existing Supabase Realtime configuration)

## Detailed Changes

### src/lib/realtime.ts

Created helper functions for managing Supabase Realtime subscriptions:

**`subscribeToTable(options)`:**
- Parameters: `table`, `event`, `callback`, `filter` (optional)
- Returns: Subscription object that can be used to unsubscribe
- Handles INSERT, UPDATE, and DELETE events
- Supports filtering by specific columns

**`unsubscribe(subscription)`:**
- Safely removes a realtime subscription
- Handles cleanup and error cases

### DataContext.tsx

Added `useEffect` hook with realtime subscriptions for the following tables:

**Orders:**
- Subscribes to INSERT, UPDATE, DELETE events
- Updates local state when orders change
- Enables real-time order tracking

**Products:**
- Subscribes to INSERT, UPDATE, DELETE events
- Updates product list in real-time
- Reflects menu changes immediately

**Outlets:**
- Subscribes to INSERT, UPDATE, DELETE events
- Updates outlet information in real-time

**Profiles:**
- Subscribes to UPDATE events
- Reflects driver status and balance changes

### NotificationContext.tsx

**Added `dbNotifications` state:**
- Stores notifications fetched from the database
- Separate from local notification state

**Added useEffect to load and subscribe:**
- Fetches existing notifications from `notifications` table on mount
- Subscribes to new notification INSERT events
- Automatically updates unread count

**Added `markDbNotificationAsRead` function:**
- Marks a notification as read in the database
- Updates local state to reflect the change

**Updated `unreadCount`:**
- Now includes both local and database notifications
- Provides accurate unread count across all sources

## Notes

- Realtime subscriptions are cleaned up on component unmount
- Supabase project must have Realtime enabled for the subscribed tables
- Consider adding debouncing for high-frequency updates in production
- RLS policies must allow subscription access for authenticated users
