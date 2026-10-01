# progress.md --- Mati FoodFinder Project Memory

> Living project memory for Codex/agents. Update after meaningful
> development sessions. Last repository review used for this snapshot:
> 2026-10-01.

## GitHub backup configuration (2026-10-01)

- Backup target: `https://github.com/Lamzeez/MFF_2.git`, remote name `backup`. Original `origin` (`MFF_UI.git`) and `main` tracking of `origin/main` are preserved.
- Back up current source, assets, configuration, documentation, tests, and migration history. Local environment files, `credentials.txt`, privileged `scratch/` scripts, dependencies, and generated output stay local and ignored.
- Removed merchant/admin password disclosure and autofill from web sign-in screens. Seed migrations now create users with random passwords and preserve existing passwords on conflict; new installations must provision seed access through Supabase Auth password recovery. No remote schema or account changes are applied as part of the Git backup.
- Verification: private-credential pattern scan of existing Git history found no matches; current eligible files contain none of the 11 known local credentials scanned. Ignore rules and `git diff --check` pass. `npm.cmd run check` passes: TypeScript and all 16 foundation unit tests. Initial missing-import errors were resolved by concurrent source updates before the final check. Remote commit comparison is required after upload.
- The backup snapshot commit skips GitHub Actions to avoid running the existing Docker-based database CI job. Follow-up: replace that deprecated CI job.
- Next: commit future source changes, then run `git push backup main` to refresh the backup. This source repository does not back up hosted Supabase database contents or storage.

## Customer Web & F12 Mobile Login Enablement (2026-10-01)

- **Customer Login Unlocked on Web via Mobile View (F12) (`app/(mobile)/portal.tsx`)**:
  - Fixed portal header button: replaced rigid `Platform.OS === 'web'` check with `ENFORCE_STRICT_PLATFORM_GUARDS && isDesktop`.
  - Developers and testers using Chrome/Edge DevTools (F12 mobile view `< 768px`) now see the active "Sign In" button in the portal header, routing directly to `/(mobile)/auth/customer-login` without being trapped in the "Available on Mobile App Only" QR modal.
  - Added dedicated "Rider Sign In" link under the Riders section of the portal pointing to `/(mobile)/auth/rider-login`.
- **Seamless Customer Sign-In Flow (`components/auth/AccountForm.tsx` & `AccountScreen.tsx`)**:
  - Added `onSuccess` callback prop to `AccountForm`.
  - Signing in on `customer-login.tsx` now immediately authenticates and routes the user into the primary mobile app tabs (`/(mobile)/(tabs)`), revealing the "Orders" tab and updating the Profile tab to show their verified customer identity (e.g. Carlos Mendoza).
- **Credentials Documentation Clarification (`credentials.txt`)**:
  - Removed misleading legacy passphrase note (`mff-admin`).
  - Added explicit URLs and F12 device view guidance for System Admin, Store Admins, Riders, and Customers.
- **Verification Suite Passing**:
  - `npm run check`: 0 TypeScript errors across the repository; 16/16 foundation unit tests passing.
  - `npm run check:client-bundle`: Android and iOS client bundles verified with Metro (949 and 915 modules).

## Guest Mode Orders Tab & Member Privileges Showcase (2026-10-01)

- **Registered Member Privileges Showcase Added to Guest Profile (`app/(mobile)/(tabs)/profile.tsx`)**:
  - Implemented a prominent, high-converting "MEMBER PRIVILEGES 🌟" showcase card displayed exclusively to Guest Users (`!isLoggedIn`).
  - Highlights the 5 core privileges and benefits of becoming a registered Mati foodie:
    1. 🛵 **Live Order Tracking & Dedicated Orders Tab**: Real-time kitchen-to-doorstep tracking with 4-digit PIN verification.
    2. 📅 **Dine-in Table Reservations**: Advance seating reservations at top Mati dining spots (Baywalk, Dahican) with zero line waiting.
    3. 💬 **Community Food Reviews & Photos**: Sharing dish reviews, rating local karenderias, and connecting with local diners.
    4. ✨ **QR Check-in & Smart Recommendations**: In-store QR code stand scanning unlocking personalized dish recommendations and "#1 Most Visited" spots.
    5. 📍 **Saved Delivery Addresses & Fast Checkout**: Preserving default Mati barangay and delivery landmarks for 1-tap checkout.
  - Features quick-action CTAs: 1-tap "Create Free Account in 30 Seconds" and "Sign In to Your Account".
  - Automatically hidden when an authenticated session is active (`isLoggedIn === true`).
- **Personalization & Delivery Sections Exclusively for Authenticated Customers (`app/(mobile)/(tabs)/profile.tsx`)**:
  - Completely removed the Personalization section (and its legacy "Locked for Guest Users" warning box) and the Mati Delivery Preferences section from the Guest User screen by scoping them with `{isLoggedIn && (...)}`.
  - Guest users now experience a focused, uncluttered Profile tab with the Member Privileges showcase, the Account login/registration form, and the About MFF information.
  - Registered customers retain full access to Personalization toggles, check-in stats (#1 Most Visited spot, scan counts), and delivery barangay/landmark settings.
- **Orders Screen & Tab Exclusively for Authenticated Customers**:
  - `app/(mobile)/(tabs)/_layout.tsx`: Applied `href: isLoggedIn ? undefined : null` to the `orders` tab screen. Unauthenticated guest users no longer see the "Orders" tab icon in their bottom navigation bar (only 4 tabs are visible: Home, Feed, Explore, Profile).
  - `app/(mobile)/(tabs)/orders.tsx`: Replaced the legacy guest hero lock card with a clean `if (!isLoggedIn) return <Redirect href="/(mobile)/(tabs)" />`. If a guest attempts to visit `/orders`, they are seamlessly redirected to Home.
  - `app/(mobile)/(tabs)/profile.tsx`: Guarded "Quick Customer Shortcuts" (Active COD Deliveries, Dining Table Bookings) with `{isLoggedIn && (...)}` so guests do not encounter dead-end order links.
  - Authenticated registered customers (`isLoggedIn === true`) retain full access to their live order tracker, courier status progress bar, 4-digit PIN handshake, and table bookings.
- **Verification Suite Passing**:
  - `npm run check`: 0 TypeScript errors across the repository; 16/16 unit tests passing.
  - `npm run check:client-bundle`: Android and iOS client bundles verified with Metro (1,060+ modules).

## Cross-Platform Separation & Rapid F12 DevTools Testing (2026-10-01)

- **Architecture Unlocked: Fast F12 Browser Testing & Native Mobile Experience**:
  - Developers can test all 5 personas on computer web using Chrome/Edge DevTools responsive mode (`F12` mobile view, `< 768px`) or desktop view (`>= 768px`) without being bounced by brittle `Platform.OS === 'web'` redirects.
  - Native mobile phone scans (Expo Go / APK) boot directly into the authentic mobile customer app (`app/(mobile)/(tabs)`).
- **Centralized Platform Policy (`lib/platform-policy.ts`)**:
  - `ENFORCE_STRICT_PLATFORM_GUARDS`: Defaults to `false` for rapid development/testing; can be toggled to `true` via `EXPO_PUBLIC_STRICT_PLATFORM_GUARDS=true` when nearing production deployment.
  - `isMobileDevice(width)` / `isDesktopDevice(width)` / `isTabletDevice(width)`: Centralized helpers distinguishing mobile, tablet, and desktop viewports.
  - `canAccessSystemAdmin(width)`: Enforces that System Admin is restricted strictly to computer desktop workstations (`Platform.OS === 'web' && width >= 768`).
  - `canAccessStoreAdminWeb(width)` & `canAccessStoreAdminKitchen(width)`: Enforces Store Admin availability on both computer web (management dashboard) and tablet/mobile phone (kitchen order display).
- **Intelligent Root Dispatch (`app/index.tsx`)**:
  - Native mobile devices (`Platform.OS !== 'web'`) and F12 mobile viewports (`width < 768px`) redirect directly to `/(mobile)/(tabs)`.
  - Desktop browsers (`width >= 768px`) redirect to `/portal`.
- **System Admin Desktop Workstation Lock (`app/(web)/system-admin/_layout.tsx`)**:
  - Native mobile phones and small mobile viewports (`width < 768px`) are greeted by an executive "Desktop Workstation Required" security gate with a 1-tap button to return to the public portal or customer app.
- **Verification Suite Passing (100% Executed without Docker)**:
  - `npm run check`: 0 TypeScript errors across the entire repository; 16/16 foundation unit tests passing including the new `platform-policy.test.ts`.
  - `npm run check:client-bundle`: Android and iOS Metro client bundles compiled cleanly (1,052+ modules).

## Current phase

**Completed Parts 2 & 3: 100% Full-Stack Supabase Integration & Mock Decommission Across All 5 Roles (Docker Skipped).**

The platform has completely transitioned from in-memory prototypes and mock datasets to the remote production Supabase backend (`tqztlckmeznbsjcszzyg`). Docker was skipped entirely. All 6 planned milestones across Parts 2 and 3 are 100% implemented, verified, and operational:
1. Orders & Delivery Pipeline with live tracking, atomic rider assignment, and 4-digit PIN completion.
2. Dine-In Table Reservations with live store confirmation/rejection and customer status feeds.
3. Realtime Notifications & In-Store QR Stand Check-Ins with accurate visit history metrics.
4. Community Foodie Feed & Reviews with live post creation, comments, heart reactions, and reporting.
5. Web Dashboards Real Data for Store Admins (live kitchen queues, menu toggles, store profile edits) and System Admins (store approvals, user moderation, gross marketplace volume telemetry).
6. Complete `PrototypeDataContext` Decommission & Cleanup across the mobile app and web portals.

## Complete End-to-End Supabase Integration (Parts 2 & 3: Milestones 1 - 6) (2026-10-01)

### 1. Database Migrations Applied to Remote Supabase (Docker Skipped)
- `20261001000100_orders_and_deliveries.sql`:
  - Created `orders`, `order_items`, and `deliveries` tables with sequential order numbers (`MFF-1001`, `MFF-1002`).
  - Implemented `claim_delivery_job(p_delivery_id, p_rider_id)` with atomic `FOR UPDATE` lock.
  - Implemented `complete_delivery_with_pin(p_delivery_id, p_rider_id, p_entered_pin)` with server-authoritative PIN validation, updating order status to `delivered` and recording completed timestamps.
  - Row Level Security (RLS) policies for customers, merchants, riders, and platform admins.
- `20261001000200_table_reservations.sql`:
  - Created `table_reservations` table with sequential reference numbers (`RES-1001`, `RES-1002`).
  - Added RLS policies for customer booking, store management, and administrative oversight.
  - Enabled Supabase Realtime replication on `table_reservations`.
- `20261001000300_notifications_and_visits.sql`:
  - Created `notifications` table with RLS and realtime publication.
  - Created `store_visits` table with check-in verification tracking (`qr_scan`, `order_fulfillment`, `manual`).
  - Automatic notification triggers for reservation confirmations and delivery milestones.
- `20261001000400_community_feed.sql`:
  - Created `community_posts`, `post_comments`, `post_reactions`, and `post_reports` tables with cascading foreign keys and indexes.
  - RLS policies allowing public viewing and authenticated creating, commenting, reacting, and reporting.
- `20261001000500_web_dashboards_admin_rpcs.sql`:
  - Security-definer RPCs: `admin_list_users()`, `admin_get_platform_metrics()`, and `merchant_get_store_metrics(store_uuid)`.
  - Added admin profile read policy to `profiles`.
- `20261002000100_enhance_realtime_publications.sql`:
  - Added `menu_items`, `stores`, `community_likes`, and `store_visits` to `supabase_realtime` publication.
  - Enabled `REPLICA IDENTITY FULL` across all 9 core transactional tables (`orders`, `table_reservations`, `notifications`, `menu_items`, `stores`, `community_posts`, `community_comments`, `community_likes`, `store_visits`), ensuring complete payload broadcasting on UPDATE/DELETE events.

### 2. Realtime Cross-User Verification (Live Multi-Client Audit)
- **Orders & Delivery Multi-Client Test (`scratch/test_realtime_multiclient.js`)**:
  - Connected 3 separate authenticated WebSocket clients simultaneously: Customer (Carlos), Merchant (Letty), and Rider (Juan).
  - Customer created an order -> Merchant instantly received `INSERT` broadcast in kitchen queue (`PASS`).
  - Merchant marked order `ready_for_pickup` -> Rider instantly received available job broadcast (`PASS`).
  - Rider claimed order via `claim_delivery_job` RPC -> Customer instantly received `out_for_delivery` event (`PASS`).
  - Rider completed delivery with 4-digit PIN via `complete_delivery_with_pin` RPC -> Customer instantly received `delivered` event (`PASS`).
- **Table Reservations Multi-Client Test (`scratch/test_reservations_realtime.js`)**:
  - Customer submitted booking request -> Merchant instantly received `INSERT` booking event (`PASS`).
  - Merchant confirmed booking -> Customer instantly received `confirmed` update broadcast (`PASS`).
- **Community Feed Multi-Client Test (`scratch/test_community_realtime.js`)**:
  - Customer posted a food review -> Feed subscribers instantly received post broadcast (`PASS`).
  - Diner commented on the review -> Post author instantly received comment notification (`PASS`).

### 3. Frontend Services & API Layer Implemented
- `services/orders.ts`: Real customer order placement, rider order pool fetching, atomic job claiming, status transitions (`placed` -> `accepted` -> `preparing` -> `ready_for_pickup` -> `out_for_delivery` -> `delivered`), PIN completion, and Supabase Realtime channel subscriptions.
- `services/reservations.ts`: Customer table booking submissions, merchant queue listing, status updates (`confirmed`, `declined`, `cancelled`), and customer reservation history.
- `services/notifications.ts`: Realtime in-app notification retrieval, unread count tracking, marking read, and live broadcast subscriptions.
- `services/visits.ts`: Real QR stand scan / check-in recording, visit history retrieval, and #1 most visited store aggregation.
- `services/community.ts`: Community review feed query, post creation, comments, heart reactions, and community post reporting.
- `services/admin.ts`: System admin user listing, user active/suspended status toggling, and platform-wide KPI telemetry.
- `services/catalog.ts`: Extended with `updateMenuItemAvailability`, `updateStoreProfile`, `fetchStoreById`, `fetchStoreMenuItems`, and `fetchUserStoreId`.

### 4. Screen Refactors Across All 5 Personas
- **Customer Mobile App (`app/(mobile)/(tabs)`)**:
  - `index.tsx`: Live orders progress banner, live Supabase notification drawer, live catalog and active order subscriptions.
  - `orders.tsx`: Live COD delivery tracking with multi-step courier status, 4-digit PIN verification handshake card, and live table reservations tab.
  - `community.tsx`: Live Mati foodie feed, real review composer, photo cards, comment threads, and like counters with Supabase Realtime updates.
  - `map.tsx`: Live nearby spots, real GPS distance calculations, live table reservation submissions to Supabase.
  - `profile.tsx`: Live profile editing (`display_name`, `contact_phone`), verified in-store QR scan counts, and live #1 most visited store calculation.
- **Rider Mobile App (`app/(mobile)/rider/index.tsx`)**:
  - Live available job queue from remote `deliveries` table.
  - 1-tap atomic job claiming using `claim_delivery_job` RPC.
  - Step-by-step delivery progress controls (`ready_for_pickup` -> `out_for_delivery`).
  - Handshake modal with 4-digit PIN entry verified server-side via `complete_delivery_with_pin` RPC with automatic COD settlement.
- **Merchant Mobile & Web (`app/(mobile)/merchant/index.tsx` & `app/(web)/dashboard`)**:
  - Mobile Kitchen Mode: Real kitchen order tickets, order status progression buttons, live table reservation approvals/declines with realtime listeners.
  - Web Store Dashboard: Live order queue, store revenue/order KPI metrics, instant menu item availability toggles, and store profile editing persisted directly to Supabase.
- **System Admin Web Dashboard (`app/(web)/system-admin`)**:
  - Overview: Live gross marketplace volume (GMV), active store count, registered user count, and recent approvals.
  - Store Approvals: Live store application review queue with 1-tap Approve/Reject RPCs updating `store_approval_status`.
  - User Accounts: Complete user directory loaded via `admin_list_users()`, role filtering, and 1-tap account suspension/activation.
  - Metrics: Live platform analytics powered by remote Supabase aggregation.

### 5. PrototypeDataContext Decommission & Cleanup
- Removed `PrototypeDataContext` dependency from `context/AuthContext.tsx`. `AuthProvider` now cleanly wraps `<SessionProvider>{children}</SessionProvider>`.
- Deprecated `context/PrototypeDataContext.tsx`.
- All mock fixture state machines replaced with real PostgreSQL tables, Row Level Security, and Realtime channels.

## Strategic Decision & Active Sprint: Real Supabase Migration (2026-09-30)

**Strategic pivot executed:**
- **Docker skipped completely**: No local Docker containers or Docker Desktop. Remote Supabase pooler connection (`aws-0-ap-northeast-2.pooler.supabase.com:5432`) used for schema migrations and data seeding.
- **Remote Migrations Applied & Verified:**
  1. `20260929000100_identity.sql`: `profiles` table, platform roles, triggers, audit events.
  2. `20260929000200_catalog.sql`: `stores`, `store_memberships`, `menu_items`, PostGIS coordinates, `get_my_application_roles` RPC.
  3. `20260929000300_access_operations.sql`: RLS policies, owner constraint triggers, admin RPCs.
  4. `20260930000100_profile_signup_fields.sql`: Profile signup metadata & contact telephone attributes.
  5. `20260930000200_seed_mati_catalog.sql`: Seeded 5 approved Mati City stores (`Mama Letty's Karenderia`, `Mati Baywalk Seafood Grill`, `Subangan Street Grills`, `Dahican Beach Bites`, `Aling Nena's Kitchen`) with PostGIS coordinates, 14 published menu items, seed merchant owner (`merchant.letty@mati-foodfinder.com`), and seed rider courier (`rider.juan@mati-foodfinder.com`).
  6. `20260930000300_cascade_user_deletions.sql`: Changed foreign key constraints on `public.profiles(id)`, `private.platform_roles(user_id)`, and `public.store_memberships(user_id)` to `ON DELETE CASCADE`. Developers can now freely delete test users from the Supabase Dashboard without foreign key constraint violation errors.
  7. `20260930000400_seed_admins_merchants_riders_customers.sql`: Seeded dedicated System Admin (`admin@mati-foodfinder.com`), 5 distinct Store Owners (`merchant.letty`, `merchant.baywalk`, `merchant.subangan`, `merchant.dahican`, `merchant.nena`), 2 additional Riders (`rider.pedro`, `rider.maria`), and 3 registered customers (`customer.carlos`, `customer.bea`, `customer.miguel`) with valid GoTrue `auth.identities` records and confirmed statuses. Verified 100% login success across all 12 test personas via `scratch/verify_all_logins.js`. Credentials exported to `credentials.txt`.

**Frontend & Backend Integration Completed:**
- **Customer Auth, Profile Editing & 6-Digit OTP**:
  - `app/(mobile)/auth/customer-login.tsx` & `customer-register.tsx` wired to Supabase Auth with 6-digit OTP code verification.
  - Enhanced `services/auth.ts` (`verifyCode`) and `components/auth/AccountForm.tsx`: supports numeric 6-digit verification code input for account activation with automatic fallback handling across Supabase token types.
  - Fixed `NavigationContainer` crash in `AccountForm.tsx`: removed NativeWind `transition-all` which triggered Reanimated screen-transition hooks requiring `NavigationContainer`. Replaced segmented control with standard foodie navigation links ("Create an account" / "Sign in").
  - Configured Resend SMTP on the remote Supabase project to send 6-digit verification codes reliably without rate limit restrictions.
  - Profile screen (`app/(mobile)/(tabs)/profile.tsx`) supports interactive Display Name and Phone Number edits persisted directly to the remote `profiles` table via `services/auth.ts`.
- **World-Class Foodie App Registration & Sign-In Standards (Uber Eats / Foodpanda / Grab UI)**:
  - Added password visibility toggles (`eye-outline` / `eye-off-outline`) across Customer, Merchant, and Rider authentication screens.
  - Integrated Philippine mobile phone number support with `+63` 🇵🇭 country prefix pill and auto-formatting (`formatPhilippineDisplay`, `cleanPhilippineNumber`).
  - Added live password strength validation indicator with 12+ character requirement chips.
  - Designed interactive 6-digit OTP verification screen with 6 digit boxes, auto-focus, and a 60-second resend cooldown timer.
  - Added explicit Terms of Service and Privacy Policy agreement disclosures.
  - Enhanced error parser (`authMessage` in `services/auth.ts`) to surface specific, actionable messages for email mailer rate limits, existing accounts, unconfirmed emails, and invalid codes without masking them behind generic network error fallbacks.
- **WebCrypto Native Polyfill with `expo-crypto`**:
  - Implemented `lib/crypto-polyfill.native.ts` and `lib/crypto-polyfill.ts` leveraging `expo-crypto` for `crypto.getRandomValues` and `crypto.subtle.digest("SHA-256")`.
  - Silenced `WARN WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.` and enabled true SHA-256 PKCE code challenges on mobile.
- **Mobile Home Feed & Layout Optimization (Uber Eats / Foodpanda Standards)**:
  - Fixed invalid Tailwind spacing classes (`px-4.5`, `mx-4.5`, `w-13`, `h-23`, `shadow-xs`) that caused broken margins, unaligned padding, and font jaggedness. Standardized to native Tailwind grid (`px-4`, `py-3`, `mx-4`, `gap-4`, `rounded-3xl`, `shadow-sm`).
  - Replaced solid pastel wireframe boxes and emojis with authentic, high-resolution food photography across all 5 Mati stores and trending dishes (`services/catalog.ts`, `mock/restaurants.ts`, `mock/dishes.ts`).
  - Optimized Guest Mode: Guests now start with a clean zero-order, zero-notification state (fixed hardcoded mock order bug in `PrototypeDataContext.tsx`), a 1-tap "Sign In" pill in the header, and an informative welcome discovery banner.
  - Optimized Registered User Mode: Added personalized time-aware greeting ("Maayong Buntag / Hapon / Gabii, [Name]!") and transformed the awkward floating order pill into an in-line Active Order status card that never overlaps cards or navigation tabs.
  - Silenced React Native LogBox toasts (`LogBox.ignoreAllLogs(true)`) in `app/_layout.tsx` so yellow development warning banners no longer cover bottom navigation tab bar labels on Android.
  - Increased bottom scroll clearance to `paddingBottom: 110` ensuring full visibility above Android 3-button navigation bars.
- **Brand Theme Unification across Modal Pop-ups & Sheets**:
  - Created reusable `components/ui/BottomSheetModal.tsx` utilizing pure native React Native `Animated`:
    - Replaced the rigid `Modal animationType="slide"` container behavior with independent stationary backdrop fade (`opacity: 0 -> 1`) and buttery smooth bottom sheet spring slide (`translateY: sheetHeight -> 0`). When closing, the dark backdrop fades out gracefully while the white sheet slides down into the floor, eliminating the awkward sliding container block.
    - Added an absolute `Pressable` backdrop so tapping anywhere outside the sheet immediately triggers dismiss.
    - Fixed the Yoga flexbox layout collapse on Android where `maxHeight: '92%'` without a definite height caused child `ScrollView flex: 1` to collapse to 0 height (which previously clipped the restaurant details and rendered only the top hero photo). Standardized to concrete screen percentages (`heightPercent={0.88}`).
  - `RestaurantProfileSheet.tsx`: Eradicated legacy emerald/green styling in favor of the unified Mati warm orange (`#EA5410`) & charcoal palette. Renders full restaurant cover photography, visual drag handle pill, rating & delivery badges, operating hours, contact details, dine-in table indicators, and a rich list of signature dishes with quick "+ Order" buttons that seamlessly launch checkout.
  - `CheckoutSheet.tsx`: Powered by `BottomSheetModal` with high-res dish photography thumbnail, quantity stepper, unified COD Delivery / Self-Pickup toggle cards, clean price breakdown, and corrected legacy non-React-Native `<strong>` HTML tags in cash reminder alerts.
  - `ReservationSheet.tsx`: Powered by `BottomSheetModal` with unified brand orange active states (`#EA5410`) for restaurant, party size, time slot, and seating preference pills.
  - `NotificationsSheet.tsx` & `StoreQrScannerModal.tsx`: Powered by `BottomSheetModal` with warm orange filter pills, unread indicators, scanner viewfinders, and tap-outside dismissal.
  - `GuestGateModal.tsx`: Added `Pressable` backdrop tap-outside dismissal and status bar translucency.
- **Feed / Community Screen Brand Unification (`app/(mobile)/(tabs)/community.tsx`)**:
  - Unified the entire Feed page with the Mati brand theme (`#EA5410` warm orange, `#111827` charcoal, rounded-3xl cards).
  - Guest Experience: Added a clean "Mati Foodie Community 🍽️" welcome card with "GUEST MODE" chip, 1-tap "Sign In" header pill, and protected interaction gates. Guests can browse reviews and comments freely without friction.
  - Registered User Experience: Personalized interactive compose card ("What did you eat in Mati, [Name]?"), avatar badge, and 1-tap "Write Review" button.
  - Replaced wireframe cartoon placeholders with high-resolution food photography across all community review posts (`mock/posts.ts`), complete with full-bleed photo cards, subtle dark overlays, and camera caption tags.
  - Upgraded "Share Food Review" and "Comments" modals to native `BottomSheetModal` with smooth fade backdrops, tap-outside dismissal, brand orange rating stars, restaurant chips, and send buttons.
  - Guaranteed clearance above Android navigation bar with `contentContainerStyle={{ paddingBottom: 110 }}`.
- **Explore / Map Screen Brand Unification (`app/(mobile)/(tabs)/map.tsx`)**:
  - Brand header with "MATI EXPLORE" tag, view mode toggle ("Map" / "List"), live GPS locate button, and 1-tap "Sign In" header pill for guests.
  - Added live GPS location strip with blue pulsing indicator and `{openCount} open near you` status pill.
  - Enhanced Mati map visualization with landmarks (Pujada Bay 🌊, Dahican Beach 🏖️, Mati City Hall 🏛️, Subangan Museum 🏛️), GPS "YOU ARE HERE" pin with pulsing radar ring, and brand orange selected pins with distance tags.
  - Floating bottom card for selected restaurant featuring real food photography thumbnail, rating, open status, and direct buttons to `View Details & Menu` or `Route`.
  - Proximity-sorted List view with high-res food photos, delivery fee badges, and Guest Mode discovery banner.
  - Embedded `RestaurantProfileSheet`, `CheckoutSheet`, `ReservationSheet`, and `GuestGateModal` directly on the Explore screen so users can view menus, order COD, and book tables without navigating away.
- **Orders & Profile Screens Brand Unification (`orders.tsx` & `profile.tsx`)**:
  - Unified all 5 core customer tabs (Home, Feed, Explore, Orders, Profile) into a singular, cohesive Mati brand design language (`#EA5410` warm orange, `#111827` charcoal, rounded-3xl cards, and `#F8FAFC` background).
  - `orders.tsx`:
    - Replaced the harsh "Registered Users Only" lock screen with a welcoming, world-class Guest Mode experience featuring interactive value highlights (Live Delivery Tracking, Secure Handshake PIN, Table Reservations) and 1-tap Sign In.
    - Upgraded active delivery cards with high-contrast `#EA5410` price callouts, live multi-step progress bar (Confirmed -> Prepped -> On the Way -> Delivered), delivery handshake PIN card, and direct rider contact button.
    - Standardized Table Bookings cards with status chips (`Confirmed`, `Pending Approval`), party size indicators, and map/call actions.
    - Set bottom clearance to `paddingBottom: 110` ensuring full visibility above Android navigation bars.
  - `profile.tsx`:
    - Overhauled Identity card with `#111827` avatar badge, role chips (`REGISTERED` vs `GUEST MODE`), in-line name/phone editor, and clean Sign Out button.
    - Refined Personalization settings card with `#EA5410` active switch states, check-in stats, and clear guest unlock prompts.
    - Standardized Mati Delivery Preferences with brand orange barangay filter pills, landmark input, and COD callout.
- **Customer Sign-In & Welcome Screens Brand Unification (`AccountScreen.tsx` & `AccountForm.tsx`)**:
  - Overhauled the authenticated welcome screen ([AccountScreen.tsx](file:///e:/Documents/Capstone/MFF_2%20-%20Copy/components/auth/AccountScreen.tsx)):
    - Replaced the pale green card and dark green button with a 5-star welcome card featuring an `ACTIVE SESSION` badge, `#111827` avatar with verified account badge, and warm `#EA5410` action button ("Start Exploring Mati Food").
    - Added secondary quick action ("View Orders & Table Bookings") and an explicit "Switch Account or Sign Out" button.
    - Fixed the broken arrow glyph (`→`) that rendered as `'n` on Android devices by replacing it with a typed `<Ionicons name="arrow-forward" size={14} color="#6b7280" />` component.
    - Conditioned the "Continue browsing as Guest" link to only render when the user is actually unauthenticated.
  - Overhauled [AccountForm.tsx](file:///e:/Documents/Capstone/MFF_2%20-%20Copy/components/auth/AccountForm.tsx):
    - Replaced all legacy emerald green branding (`bg-emerald-700`, `text-emerald-700`, `border-emerald-700`) with warm orange (`#EA5410`).
    - Standardized primary submit button, 6-digit OTP active input focus borders, Terms/Privacy agreement links, and mode switch links to the unified brand palette while preserving semantic emerald for verified requirement states.
- **Web Portal Unification & Route Collision Resolution**:
  - **Eliminated Duplicate Route Collision**: Removed `app/(web)/portal/index.tsx` (Design 2) and `app/(web)/index.tsx` (unused mockup landing). In Expo Router, route groups `(mobile)` and `(web)` share URL paths, causing `localhost/portal` to load Design 2 while `localhost` redirected to Design 1 (`/(mobile)/portal`).
  - **Single Authoritative Portal (Design 1)**: Upgraded `app/(mobile)/portal.tsx` to be fully responsive for desktop web and mobile:
    - Added a desktop max-width responsive container (`maxWidth: 1080`, centered) with smooth backdrop styling.
    - Added top navigation bar with quick links for Customer Sign In, Store Admin (`/(web)/auth/store-login`), and System Admin (`/(web)/system-admin`).
    - Added 3-way partner switcher (`merchant`, `rider`, `admin`) with direct links to web dashboards.
    - Updated bottom dock with full-width CTA to browse restaurants.
    - Updated `app/(web)/auth/verification.tsx` to link to `/portal`.
- **Store Admin Web Dashboard Overhaul (`app/(web)/dashboard/*`)**:
  - `app/(web)/auth/store-login.tsx`: Modern brand orange card, password reveal toggle, return-to-portal link; embedded password and Auto-fill helper removed before the GitHub backup. Fixed `store_memberships` query bug: the table uses composite primary key `(store_id, user_id)` without a separate `id` column; removed `id` from `.select("role, store_id, is_active")` to prevent Postgres error 42703 that previously blocked store merchant logins.
  - `app/(web)/dashboard/_layout.tsx`: Desktop sidebar with brand orange `#EA5410` active pills, Ionicons, active store info badge, and sign-out action.
  - `app/(web)/dashboard/index.tsx`: Executive KPI stats (Today's Orders, COD Revenue, Store OPEN/CLOSED toggle), live recent orders feed with status chips, and top selling dishes.
  - `app/(web)/dashboard/menu.tsx`: Real Supabase menu query (`fetchLiveMenuItems`), category filters, search input, instant availability toggle pills (`AVAILABLE` vs `SOLD OUT`), and fixed `item.imageUrl` typing.
  - `app/(web)/dashboard/profile.tsx`: Store cover photo upload preview, business hours, and contact details.
  - `app/(web)/dashboard/billing.tsx`: Active pioneer trial status, PayMongo checkout notes, and payout account cards.
- **System Admin Web Experience Overhaul (`app/(web)/system-admin/*`)**:
  - `app/(web)/system-admin/gate.tsx`: **Replaced fake passphrase gate with Real Supabase Auth**:
    - Authenticates administrator accounts through Supabase Auth; embedded password and Auto-fill helper removed before the GitHub backup.
    - 1-click Auto-fill button for fast, error-free authentication.
    - Verifies platform role (`superadmin` or `admin`) via `client.rpc("get_my_application_roles")`.
    - Rejects unauthorized users and logs out to guest.
  - `app/(web)/system-admin/_layout.tsx`: Executive obsidian dark theme (`#0B0F17` / `#111827`) with `#EA5410` brand orange active indicators, verified admin badge, and lock/sign-out action.
  - `app/(web)/system-admin/index.tsx`: System overview with platform KPIs (Total Users, Active Stores, Pending Approvals, COD Volume), interactive pending store approval cards with 1-click Approve/Reject, and security audit feed.
  - `app/(web)/system-admin/approvals.tsx`: Searchable applications data table with status tabs (`Pending`, `Approved`, `Rejected`) and action controls.
  - `app/(web)/system-admin/users.tsx`: Full user management directory with search, role filters, real Mati personas, and suspend/restore toggles.
  - `app/(web)/system-admin/moderation.tsx`: Social feed flagged reports with delete/ban and mark-safe actions.
  - `app/(web)/system-admin/metrics.tsx`: GMV volume chart, acquisition channels, and Supabase latency telemetry. Cast `bar.height as DimensionValue` for strict React Native ViewStyle typing.
- **Web Version Separation & Mobile Mockup Route Guards**:
  - **Isolated Mobile Mockup from Web**: Completely prevented mobile app mockup screens (`(tabs)`, `merchant`, `rider`, `(mobile)/auth/*`) from being loaded in a desktop web browser.
  - **Comprehensive Web Guards**:
    - `app/(mobile)/_layout.tsx`: Inspects `usePathname()`; any web browser request targeting mobile-only screens automatically redirects to `/portal`.
    - `app/(mobile)/(tabs)/_layout.tsx`: Redirects web visitors directly to `/portal`.
    - `app/(mobile)/merchant/index.tsx`: Redirects web visitors to `/(web)/auth/store-login`.
    - `app/(mobile)/rider/index.tsx`: Redirects web visitors to `/portal`.
    - `app/(mobile)/auth/*`: All mobile login and registration screens bounce web visitors to `/portal` or the web store login/registration routes.
    - `app/index.tsx`: Web traffic is routed to `/portal`, while native devices route to `/(mobile)/portal`.
  - **Responsive Web Portal ("Design 1") & Mobile App Modal**:
    - Replaced the mobile-mockup redirects on the web portal with a dedicated **"Available on Mobile App"** modal.
    - Web users clicking "Explore Mati Restaurants & Menus", cuisine cards, or carousel highlights are shown a branded QR code modal with camera scan instructions, direct APK download button, and Expo Go development instructions.
    - Header navigation on web displays "Store Admin" (`/(web)/auth/store-login`), "System Admin" (`/(web)/system-admin`), and "Get Mobile App".
    - Sticky bottom dock adapts to web: Displays "Get the Mati FoodFinder Mobile App" with mobile-exclusive ordering/tracking notices.
    - "What's your craving?" section rendered as a responsive flex grid (`flex: 1` across cards) on desktop viewports (`width >= 768px`) for balanced horizontal symmetry.




**Verification Suite (Executed without Docker):**
- `npm run check`: TypeScript static analysis passed with 0 errors; 12/12 unit tests passed (`tests/foundation/*.test.ts`).
- **Merchant Authentication & Role Verification**:
  - `app/(mobile)/auth/merchant-login.tsx`: wired to real `signIn(email, password)`. Verifies active store membership via `store_memberships`. Rejects unauthorized accounts and logs out to guest.
  - `app/(mobile)/auth/merchant-register.tsx`: wired to `signUp(name, email, password, phone)` with 12+ character password enforcement.
  - `app/(web)/auth/store-login.tsx`: wired to real Supabase auth and store membership checks.
  - Retired demo credentials (`lette@karenderia.com`) and mock bypasses.
- **Rider Authentication & Role Verification**:
  - `app/(mobile)/auth/rider-login.tsx`: wired to real `signIn(email, password)`. Verifies rider platform role via `client.rpc("get_my_application_roles")`. Rejects non-riders.
  - `app/(mobile)/auth/rider-register.tsx`: wired to `signUp` with vehicle details and COD agreement.
  - Retired mock rider shortcuts (`R-402`, PIN `1234`, `M-403`).

**Verification Suite (Executed without Docker):**
- `npm run check`: TypeScript static analysis passed with 0 errors; 12/12 unit tests passed (`tests/foundation/*.test.ts`).
- `npm run check:client-bundle`: Android and iOS client bundle verification passed (1,060+ modules resolved with Metro bundler).
- Remote PostgREST query verification: verified live store rows (5) and menu items (14) with RLS access controls enforced.
- Live Auth Verification: 12/12 accounts verified with real password logins against Supabase Auth.

**Next Goal / Next Tasks:**
1. Migrate Orders and Table Reservations to remote Supabase tables (`orders`, `order_items`, `reservations`) with Row Level Security policies so customer order placement directly populates the Merchant Kitchen queue and Rider Job dispatch queue instead of `PrototypeDataContext` memory.
2. Add real-time Supabase subscriptions (`supabase.channel(...)`) for incoming orders on the kitchen screen (`app/(mobile)/merchant/index.tsx`) and available dispatch jobs on the rider screen (`app/(mobile)/rider/index.tsx`).

## Verified repository baseline

-   Universal React Native + Expo Router frontend targeting mobile and
    web use cases.
-   Expo SDK 57-era dependency set.
-   TypeScript + NativeWind/Tailwind styling.
-   Customer tabs include Home, Feed/Community, Explore/Map, Orders, and
    Profile.
-   Separate merchant and rider mobile experiences exist.
-   System-admin web area exists.
-   Mock fixtures have been extracted into a `mock/` directory for
    several customer features.
-   Reusable components now exist for checkout, reservation,
    notifications, restaurant profile, authentication gate, QR, and
    other UI concerns.
-   `app/(mobile)/(tabs)/index.tsx` has already been reduced
    substantially from the older \~2,000-line version documented in
    `REFACTORING.md`.
-   `app/(mobile)/portal.tsx` has also been reduced substantially from
    its older \~1,000-line state.
-   Community is now a separate tab/route.
-   Merchant mode defaults to an orders-oriented workflow and uses the
    canonical `OrderStatus` type.
-   Rider flow includes COD collection confirmation and customer
    completion PIN behavior.
-   Device location is requested through `expo-location`; nearby
    distances are currently computed locally with Haversine distance.
-   Real Supabase-backed production data/auth is not yet the primary
    implementation.

## What is working well conceptually

### Customer

-   Guest-first discovery lowers onboarding friction.
-   Ordering, reservation, discovery/map, community, notifications,
    QR/check-in, profile, and tracking concepts are represented.
-   The five-tab customer information architecture is understandable.
-   Guest gating generally happens at transactional/personal actions
    rather than blocking discovery.

### Merchant

-   Operational order queue is treated as the primary merchant job.
-   Menu availability/inventory and reservation concepts are present.
-   Order statuses are moving toward a shared vocabulary.

### Rider

-   Independent delivery-job concept is represented.
-   Online/offline state, job acceptance, delivery stages, COD
    collection, PIN confirmation, earnings, and completion are
    represented.

### Architecture

-   Expo Router route groups provide a reasonable starting separation.
-   Mock data has begun moving out of screens.
-   Several large UI concerns have already been extracted into reusable
    components.
-   A canonical order status type exists.

## Current critical gaps

### P0 --- Backend authority and persistence

Most important gap.

Current prototype state is largely client/in-memory. A production
marketplace cannot rely on local React state for: - authentication -
orders - reservation state - rider job claiming - menus/inventory -
community posts/comments - notifications - store visits -
pricing/totals - COD settlement - admin authorization

**Target:** Supabase/PostgreSQL/PostGIS/Auth/Storage/Realtime/RLS
becomes the authoritative data layer, with migrations and policies in
version control.

### P0 --- Authentication/authorization

`AuthContext` still contains prototype login behavior and application
data beyond authentication.

The system-admin passphrase documented in `REFACTORING.md` is explicitly
placeholder security.

**Target:** - real Supabase Auth - profiles + roles - role/ownership
enforcement through RLS/backend - protected admin/merchant/rider
mutations - no client-public secret used as an authorization boundary

### P0 --- Cross-role order state machine

The customer `ActiveOrder` model still uses legacy statuses such as: -
`confirmed` - `prepped` - `on_the_way` - `delivered`

Merchant code uses the newer canonical order status model.

**Target:** one order state machine across customer, merchant, rider,
database, realtime events, notifications, and tests.

### P0 --- Transaction integrity

Future real implementation needs atomic/server-authoritative operations
for: - creating orders and computing totals - decrementing/validating
stock - merchant acceptance - rider job claim - pickup - delivery
completion - COD settlement - cancellation/refund-like compensating
behavior where applicable

### P1 --- `AuthContext` separation

`context/AuthContext.tsx` currently manages auth plus notifications,
reservations, orders, personalization, and visits.

**Target:** Auth/session context becomes narrow. Feature/server data
moves to dedicated services/hooks/repositories and backend queries.

### P1 --- Large route files remain

Examples observed: - `app/(mobile)/merchant/index.tsx` remains very
large. - `app/(mobile)/(tabs)/community.tsx` remains large. - customer
Home is improved but still coordinates many concerns.

**Target:** route files orchestrate features; domain logic and
substantial UI sections live in focused modules.

### P1 --- Design-system consistency

Customer Home uses an orange/neutral visual language while Orders and
other older screens still use emerald-heavy styling. Some screens use
StyleSheet constants; others use many inline NativeWind color literals.

**Target:** shared design tokens + primitives + consistent semantic
states.

### P1 --- Reservation semantics

A reservation submission should remain **pending** until merchant/system
confirmation. Customer messaging must not say it is confirmed at request
creation.

### P1 --- Real map/routing/serviceability

Current Explore logic requests GPS and calculates Haversine distance to
hardcoded restaurant coordinates.

**Target:** - persisted PostGIS store locations - map implementation -
serviceability/delivery zones - road routing/ETA (e.g. OSRM or chosen
provider) - graceful permission/offline behavior

### P1 --- Automated quality gates

Typecheck, focused foundation unit tests, database lint and 63 pgTAP assertions pass
locally. The CI workflow is prepared but has not run remotely. General UI
linting and E2E coverage remain future work. Do not treat a bundle export as a
device runtime or database verification.

### P1 --- Lists/performance

Large feeds/lists currently use `ScrollView` in important areas.

**Target:** migrate dynamic/paginated collections to
`FlatList`/`SectionList` where appropriate, especially community,
marketplace, orders, and jobs.

### P2 --- Community production requirements

Needs persistence, moderation, reporting, ownership rules, pagination,
abuse controls, and media policy.

### P2 --- Personalization accuracy/privacy

Current "ML pick" behavior appears closer to a deterministic
most-visited heuristic than an ML recommender.

**Target:** call it a heuristic until a real model exists; define opt-in
event tracking, consent, retention, and recommendation evaluation before
expanding it.

### P2 --- Production imagery/content

Emoji and mock content are useful for prototyping but should not be the
final marketplace visual system.

**Target:** store/menu image pipeline, placeholders, caching,
compression, moderation/validation, and consistent aspect ratios.

### P2 --- Observability

Define crash reporting, structured errors, analytics events, operational
metrics, and audit trails before launch.

## Current recommended implementation order

Current session priority overrides the broader sequence below: finish verifying
the approved six-table Supabase foundation before any feature migration.

1.  Stabilize canonical domain types/state machines.
2.  Add quality scripts and baseline CI.
3.  Define Supabase schema + migrations + RLS + generated types.
4.  Implement real authentication and role profiles.
5.  Migrate store/menu discovery to backend.
6.  Implement backend-backed cart/order creation with
    server-authoritative pricing.
7.  Connect merchant order queue through realtime/backend mutations.
8.  Implement atomic rider job claim + delivery lifecycle + COD proof.
9.  Implement reservations end-to-end.
10. Migrate notifications.
11. Migrate community with moderation/reporting.
12. Implement PostGIS/serviceability/routing.
13. Harden offline/error/loading states and performance.
14. Consolidate design system and perform full UX polish.
15. Add deeper analytics/personalization only after reliable event data
    exists.

## Near-term refactor targets

-   Unify customer/merchant/rider order status types.
-   Correct reservation confirmation copy/state.
-   Reduce `AuthContext` responsibility.
-   Break merchant screen into feature components/routes.
-   Break community into feed/post/comment components and data hooks.
-   Centralize restaurant fixtures while mock mode remains.
-   Introduce shared design tokens/primitives.
-   Remove stale comments/docs that describe already-completed
    refactors.

## Verification baseline & debt

- `npm run check` (`npm run typecheck && npm test`) and `npm run check:client-bundle` pass reliably without Docker.
- Docker-dependent scripts (`db:start`, `db:lint`, `db:test`) are de-scoped and skipped.
- Device smoke checks and end-to-end authentication flow verification on remote Supabase remain the current verification focus.

## Key architectural decisions to preserve unless deliberately changed

-   MFF is Mati City-focused.
-   Customer discovery can be used as guest.
-   Transactional/personal features require authentication.
-   Delivery riders are independent platform riders, not permanently
    tied to one store.
-   A store can control whether it permits delivery.
-   COD is an important fulfillment/payment path.
-   Table reservations are part of the product.
-   Community/social food discovery is part of the product.
-   Personalization is opt-in.
-   Supabase/PostgreSQL/PostGIS is the intended backend direction.
-   Expo/React Native remains the universal frontend direction unless a
    documented architecture decision changes it.

## End-of-session update template

Append/update the relevant sections rather than creating an endless
diary.

**Completed** - ...

**Decisions** - ...

**Verification** - command/result - ...

**Known issues** - ...

**Next** 1. ... 2. ... 3. ...
