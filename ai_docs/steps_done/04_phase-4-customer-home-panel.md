# Phase 4: Customer Home Panel Redesign

## Overview

Phase 4 delivers a major redesign of the customer home page with category grid, recommendation slider, best seller section, banner carousel integration, and improved outlet cards with ETA display.

## Files Created

None

## Files Modified

- `src/app/pages/Home.tsx` - Major redesign with new sections and features

## Files Deleted

None

## Database Changes

None (uses existing `is_recommended` and `is_best_seller` columns from Phase 1)

## Detailed Changes

### Home.tsx Major Redesign

**Category Grid (3x2 with expand):**
- `foodCategories` array with 6 categories
- Displays in a 3-column by 2-row grid layout
- "Show All" / "Show Less" toggle to expand/collapse
- State: `showAllCategories`, `visibleCategories`

**foodCategories array:**
```typescript
const foodCategories = [
  { id: 1, name: 'Nasi', icon: '🍚' },
  { id: 2, name: 'Mie', icon: '🍜' },
  { id: 3, name: 'Minuman', icon: '🥤' },
  { id: 4, name: 'Snack', icon: '🍟' },
  { id: 5, name: 'Dessert', icon: '🍰' },
  { id: 6, name: 'Lainnya', icon: '🍽️' },
];
```

**Recommendation Slider:**
- Displays products with `is_recommended: true`
- Horizontal scrollable carousel
- Shows product image, name, and price

**Best Seller Section:**
- Displays products with `is_best_seller: true`
- Dedicated section highlighting popular items

**Menu Pilihan Section:**
- Shows all available products
- Filtered by outlet availability

**Banner Carousel Integration:**
- Integrated existing `BannerCarousel` component
- Fetches banners from Supabase `banners` table
- State: `banners` array
- Imported `supabase` client for data fetching

**ETA Display on Outlet Cards:**
- Added estimated time of arrival to outlet cards
- Shows delivery time estimate based on distance

### Product Filtering

**`recommendedProducts`:**
- Filters products where `is_recommended === true`

**`bestSellerProducts`:**
- Filters products where `is_best_seller === true`

**`allProducts`:**
- Returns all available products without filtering

### formatCurrency Helper

Added helper function for currency formatting:
```typescript
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};
```

## Notes

- BannerCarousel component already existed, was integrated into Home
- Supabase import added for fetching banners from database
- Category icons use emoji for simplicity
- Product filtering is done client-side
