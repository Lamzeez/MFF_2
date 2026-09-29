# MFF_UI — Review Findings & Refactor Guide

This file documents the fixes already applied in this build and the
recommended refactors that should be done with the app running (they change
navigation structure and need visual verification).

## Already applied in this build

1. **Demo credentials are dev-only** (`app/(mobile)/portal.tsx`)
   - Merchant login and rider login fields are pre-filled only when `__DEV__`
     is true. Production builds render empty fields.

2. **System Admin auth gate** (`app/(web)/system-admin/gate.tsx` + `_layout.tsx`)
   - The entire `/system-admin` section now sits behind a passphrase screen.
   - The passphrase comes from `EXPO_PUBLIC_ADMIN_PASSPHRASE`; in dev it
     falls back to `mff-admin`.
   - This is a placeholder, not real security. Replace it with Supabase Auth
     + an admin role check as soon as the backend lands.

## Recommended refactors (do these with the app running)

### 1. Split the customer home screen — highest priority
`app/(mobile)/(tabs)/index.tsx` is ~2,000 lines doing five jobs:
menu browsing, checkout, reservations, notifications, and a social feed.

Target structure:
```
app/(mobile)/(tabs)/
  index.tsx        → discovery + live menus ONLY (default landing)
  community.tsx    → the social feed, moved to its own tab
  map.tsx          → unchanged
  orders.tsx       → unchanged
  profile.tsx      → unchanged
components/feed/
  MenuCard.tsx, CheckoutModal.tsx, ReservationModal.tsx,
  NotificationsModal.tsx, PostCard.tsx, CommentsModal.tsx
mock/
  restaurants.ts, posts.ts, notifications.ts
```
Steps:
1. Create `mock/` and move every hardcoded array (restaurants, posts,
   notifications, barangays) out of the screens first. This alone removes
   hundreds of lines and is zero-risk.
2. Extract the modals into `components/feed/` one at a time, testing after
   each extraction.
3. Move the `community` feedMode branch into `community.tsx` and register it
   in `_layout.tsx` as a new tab (icon: `chatbubbles`). Delete the mode
   toggle from `index.tsx`.

### 2. Split the mobile portal (`app/(mobile)/portal.tsx`, ~1,000 lines)
Each role's login/registration should be its own route:
```
app/(mobile)/auth/
  customer-register.tsx
  merchant-login.tsx
  merchant-register.tsx
  rider-login.tsx
  rider-register.tsx
```
The portal keeps only the role cards, each linking to its route. Modals
stacked on modals are hard to use on small phones; routes get proper
keyboard handling and back behavior for free.

### 3. Merchant mode home = order queue
In `app/(mobile)/merchant/index.tsx`, make the incoming-orders queue the
default view. Menu editing and store settings belong behind tabs, not on
the kitchen's front screen. Order actions should be one big button per
state: Accept → Preparing → Ready for pickup.

### 4. Status vocabulary — lock it now
Before Supabase, write the order status enum in one file and use it
everywhere:
```ts
// types/order.ts
export const ORDER_STATUSES = [
  "placed", "accepted", "preparing",
  "ready_for_pickup", "out_for_delivery", "delivered", "cancelled",
] as const;
```
The same label must appear on the customer, merchant, and rider screens.

### 5. Rider delivery confirmation
Add photo or customer-PIN confirmation at hand-off in
`app/(mobile)/rider/index.tsx` — with COD, this is your dispute protection.

### 6. Then wire Supabase
Only after 1–3. With mock data already in `mock/`, swapping to real queries
becomes a file-by-file replacement instead of surgery on 2,000-line screens.
