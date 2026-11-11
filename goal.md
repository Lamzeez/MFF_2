# goal.md --- Mati FoodFinder Product & Engineering Goals

## North star

Build Mati FoodFinder into a reliable, polished, locally relevant food
platform for Mati City that feels as coherent and trustworthy as a
mature international consumer app while preserving its own Mati
identity.

Do not copy Foodpanda, Uber, Grab, or another company's branding/trade
dress. Match the quality bar: clarity, speed, consistency, reliability,
safety, and operational correctness.

## Product promise

A customer should be able to answer: - What good food is near me? - What
is available now? - Can I order it? - Can I reserve a table? - Where is
my order? - Can I trust the store/rider/status shown? - What are people
in Mati enjoying?

A merchant should be able to answer: - What requires my attention right
now? - What orders are waiting? - What is being prepared? - What is
ready? - What menu items are available? - What reservations need
action? - Is delivery enabled?

A rider should be able to answer: - Am I online? - What jobs can I
accept? - What do I earn? - Where do I pick up/drop off? - What stage is
the delivery in? - How do I prove COD handoff safely?

An administrator should be able to manage the platform without bypassing
real authorization.

## Experience principles

1.  **Discovery before friction** --- guests can browse before
    registering.
2.  **One obvious next action** --- operational screens prioritize the
    current task.
3.  **Trust through accurate state** --- never display a status the
    backend has not established.
4.  **Fast perceived performance** --- responsive interactions,
    skeletons, caching, pagination.
5.  **Graceful failure** --- offline, GPS denied, store closed, item
    unavailable, rider unavailable, and backend errors have intentional
    UX.
6.  **Consistent visual language** --- one design system, not
    screen-by-screen themes.
7.  **Local identity, global quality** --- Mati-specific content and
    terminology with professional interaction design.
8.  **Privacy by design** --- personalization is transparent and opt-in.
9.  **Operational integrity over demo shortcuts** --- money, order
    state, roles, inventory, and delivery completion are
    server-authoritative.
10. **Accessible by default** --- readable contrast, touch targets,
    labels, keyboard/screen-reader consideration.

## Milestone 1 --- Architecture stabilization

### Goal

Turn the current high-fidelity prototype into a codebase ready for real
backend integration.

### Acceptance criteria

-   [ ] One canonical order model/status state machine is used by
    customer, merchant, and rider.
-   [ ] Reservation state semantics are consistent.
-   [ ] Auth/session responsibilities are separated from application
    data.
-   [ ] Large route files are incrementally decomposed.
-   [ ] Shared design tokens/primitives exist.
-   [ ] Mock data is clearly isolated.
-   [ ] Typecheck/lint/test scripts are available.
-   [ ] CI runs baseline quality checks.
-   [ ] `AGENTS.md` and `progress.md` reflect the real repository.

## Milestone 2 --- Secure Supabase backend & real authentication

### Goal

Make remote/hosted Supabase the authoritative system of record, beginning with real authentication, registrations, sign-ins, and persistent sessions. Docker is skipped completely.

### Milestone 2A: Real Auth & Sessions (Completed)
- [x] Remote Supabase project connected via `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- [x] Database migrations applied to remote Supabase (`profiles`, `platform_roles`, `stores`, `store_memberships`, `menu_items`).
- [x] Customer real registration & login with email validation/confirmation and password policies.
- [x] 6-digit email OTP verification configured in `services/auth.ts` and `components/auth/AccountForm.tsx` for account activation.
- [x] Merchant real registration & login linked to store ownership/membership.
- [x] Rider real registration & login linked to platform rider role.
- [x] Persistent session management using `SessionContext.tsx` + `lib/supabase/client.native.ts` (SQLite) / web storage.
- [x] Auth state lifecycle: token auto-refresh, app foreground/background sync, session recovery.
- [x] Decommission mock login bypasses (`lette@karenderia.com`, demo passwords, instant role hops).
- [x] Guest discovery preserved: browsing open, transactional features gated by `GuestGateModal`.

### Milestone 2B: Data persistence & RLS (Active)
- [x] RLS policies verified on remote Supabase for all roles.
- [x] Stores, menus, menu items modeled with PostGIS geographic coordinates.
- [x] Client database types synchronized with remote schema in `types/database.ts`.
- [x] No secrets shipped in client bundles.
- [ ] Live OTP code verification test in Expo Go with updated Supabase email template.
- [ ] Orders, order items, reservations, and delivery tracking database tables and real-time subscriptions.

## Milestone 3 --- Production customer ordering

### Goal

Deliver a complete customer happy path backed by real data.

### Acceptance criteria

-   [ ] Browse/search/filter real stores and menus.
-   [ ] Store open/closed and item availability are accurate.
-   [ ] Cart supports multiple quantities and clear pricing.
-   [ ] Delivery vs pickup rules are explicit.
-   [ ] Server-authoritative order total is created safely.
-   [ ] Customer sees loading/error/retry states.
-   [ ] Order history and active tracking persist across app restarts.
-   [ ] Notifications/status updates reflect backend state.
-   [ ] Cancellation rules are defined.

## Milestone 4 --- Merchant operations

### Goal

Make merchant mode usable during real kitchen operations.

### Acceptance criteria

-   [ ] Incoming orders are the default operational queue.
-   [ ] Merchant can accept/reject according to defined rules.
-   [ ] State transitions are validated.
-   [ ] Menu/stock availability persists.
-   [ ] Delivery enable/disable setting persists.
-   [ ] Reservations can be confirmed/declined.
-   [ ] Realtime updates work reliably.
-   [ ] Merchant identity/store ownership is enforced.

## Milestone 5 --- Rider delivery network

### Goal

Support independent riders safely and without double-assigning jobs.

### Acceptance criteria

-   [ ] Eligible jobs are derived from backend state.
-   [ ] Job claim is atomic.
-   [ ] Only the assigned rider can mutate delivery state.
-   [ ] Pickup and handoff states are validated.
-   [ ] Customer PIN/proof flow is implemented securely.
-   [ ] COD amount and settlement events are auditable.
-   [ ] Rider earnings derive from completed backend records.
-   [ ] Failure/cancellation/reassignment rules exist.

## Milestone 6 --- Location, routing, and serviceability

### Goal

Make "nearby" and delivery estimates meaningful.

### Acceptance criteria

-   [ ] Store coordinates are persisted in PostGIS.
-   [ ] Device GPS permission states have intentional UX.
-   [ ] Nearby search uses geographic queries.
-   [ ] Delivery serviceability rules are modeled.
-   [ ] Route distance/time uses the chosen routing provider rather than
    only Haversine.
-   [ ] Map/list views share one data source.
-   [ ] Location failure does not make the app unusable.

## Milestone 7 --- Reservations

### Goal

Make reservations a trustworthy two-sided workflow.

### Acceptance criteria

-   [ ] Customer requests a valid slot.
-   [ ] Request begins as pending.
-   [ ] Merchant receives and acts on it.
-   [ ] Customer receives confirmed/declined/cancelled state.
-   [ ] Capacity/availability rules are defined.
-   [ ] Duplicate/conflicting requests are handled.
-   [ ] Reservation history persists.

## Milestone 8 --- Community and trust

### Goal

Launch the social layer without creating an unmanaged abuse surface.

### Acceptance criteria

-   [ ] Posts/comments/reactions persist.
-   [ ] Ownership/edit/delete rules exist.
-   [ ] Reporting exists.
-   [ ] Admin moderation workflow exists.
-   [ ] Abuse/spam controls exist.
-   [ ] Pagination exists.
-   [ ] User-generated media rules exist if images are supported.
-   [ ] Restaurant/dish tagging uses real IDs, not display strings.

## Milestone 9 --- Personalization

### Goal

Provide useful recommendations only after reliable consented data
exists.

### Acceptance criteria

-   [ ] Consent state persists.
-   [ ] Event taxonomy is documented.
-   [ ] Data collection is minimized.
-   [ ] Recommendation baseline is measurable.
-   [ ] Heuristics are not mislabeled as ML.
-   [ ] Recommendation quality can be evaluated.
-   [ ] Opt-out behavior is respected.

## Milestone 10 --- Production polish

### Goal

Reach a cohesive "mature consumer app" quality bar.

### Acceptance criteria

-   [ ] Shared design system is used across
    customer/merchant/rider/admin.
-   [ ] Real image pipeline with placeholders/caching.
-   [ ] Loading, empty, error, offline, and permission states across
    critical flows.
-   [ ] Accessibility review.
-   [ ] Performance review on lower-end Android hardware.
-   [ ] Crash/error reporting.
-   [ ] Product analytics for critical funnels.
-   [ ] E2E tests for customer order, merchant fulfillment, rider
    delivery, and reservation.
-   [ ] Release/build process documented.
-   [ ] Security/RLS review completed.

## Current priority: System Remediation & Production Completeness (Phases A–F)

The approved active goal is the comprehensive remediation of functional gaps, UI/theme discrepancies, and system shortfalls identified during the system-wide audit:

### Phase A: Critical Multi-Item Cart & Booking Bugfixes (Completed)
- [x] Fix `CartContext.tsx` `updateQuantity` & `removeItem` to key by unique composite `itemId` (rather than generic `dishId`), preventing cross-variation quantity and deletion collisions on customized dishes.
- [x] Upgrade `ReservationSheet.tsx` date handling: replace hardcoded `"Tonight"` string with interactive day selector pills (*"Today"*, *"Tomorrow"*, *"This Weekend"*, or custom date) serializing canonical ISO `YYYY-MM-DD` strings for PostgreSQL `table_reservations`.

### Phase B: Community Moderation Trigger & Rider/Store Rating Wiring (Completed)
- [x] Add customer-facing "Report Post" action button and reason selector sheet to `app/(mobile)/(tabs)/community.tsx`, hooking into `reportCommunityPost` and remote `post_reports` queue.
- [x] Wire Rider Profile Modal in `app/(mobile)/rider/index.tsx` to query live courier star ratings and customer compliments via `fetchRiderRatingSummary`.
- [x] Connect live store ratings and review counts to catalog cards in `services/catalog.ts` via `fetchStoreRatingSummary` / `get_store_rating_summary`.

### Phase C: Web Merchant Profile Persistence & Storage (Completed)
- [x] Add `operating_hours` and `cover_image_url` columns to `public.stores` via Supabase migration.
- [x] Implement real store cover image upload to Supabase Storage (`store-branding` bucket with `foodie-uploads` fallback) in `app/(web)/dashboard/profile.tsx`.
- [x] Persist store operating hours in web and mobile merchant settings to remote database.
- [x] Persist customer `personalization_consent` boolean in `public.profiles`.

### Phase D: Design Token Unification & Web Alert Modernization (Completed)
- [x] Audit and replace raw inline status ternaries with canonical `lib/status-tokens.ts` across `app/(mobile)/merchant/index.tsx`, `app/(web)/system-admin/approvals.tsx`, and `app/(web)/system-admin/users.tsx`.
- [x] Standardize Brand Primary to `#EA5410` and modal backdrop dimming to `bg-black/60`.
- [x] Replace disruptive raw browser `alert()` popups in Web Store and System Admin views with styled inline notification/toast banners.

### Phase E: Admin Analytics Aggregation & Offline Banner (Completed)
- [x] Implement Supabase RPC `admin_get_monthly_gmv()` aggregating live order sums grouped by month/week to power `app/(web)/system-admin/metrics.tsx` bar chart.
- [x] Query real QR check-in ratios from `store_visits` for admin telemetry discovery channels.
- [x] Add top-level offline connectivity detector and subtle reconnecting banner for weak Mati cellular signals.
- [x] Replace reservation "Directions" alert stub with deep link navigation to maps.

### Phase F: Quality Gates & Documentation Memory (Completed)
- [x] Add automated unit tests covering composite cart item mutations, date serialization, and token compliance in `tests/foundation/`.
- [x] Execute standard quality suite: `npm test`, `npm run typecheck`, and `npm run check:client-bundle`.
- [x] Update `progress.md` with verified phase changes.

## Anti-goals

Until Phases A–F are complete, do NOT prioritize:
- Implementing Phase 4C (PayMongo payment gateway) until explicitly requested in a later phase.
- Setting up or troubleshooting local Docker or containerized databases.
- Modifying working code without explicit phase-by-phase instruction from the user.
- Decorative animations or visual redesigns unrelated to token standardization.

## Success metrics to define before pilot

Candidate metrics: - crash-free sessions - customer search -\> store
view conversion - store view -\> checkout conversion - order creation
success rate - merchant acceptance latency - order completion rate -
rider job claim failure/double-claim rate - delivery completion time -
reservation confirmation rate - backend/API error rate - location
permission success/fallback rate - customer-reported order issues -
repeat usage

Do not optimize metrics before instrumentation is trustworthy.
