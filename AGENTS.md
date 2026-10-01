# AGENTS.md --- Mati FoodFinder (MFF)

## Mission

Mati FoodFinder (MFF) is a Mati City-focused food discovery, ordering,
table-reservation, community, merchant, rider, and administration
platform.

The product should feel trustworthy, fast, simple, and cohesive. Treat
this repository as a real product under active development, not as a
disposable prototype.

## Source of truth

Before substantial work: 1. Read this file. 2. Read `progress.md`. 3.
Read `goal.md`. 4. Inspect the relevant implementation before proposing
changes. 5. Check `git status` and recent Git history. 6. Never assume
an item in `progress.md` is still true when the code proves otherwise.

After substantial work: 1. Run appropriate verification. 2. Update
`progress.md`. 3. Update `goal.md` only when priorities, milestones, or
acceptance criteria change. 4. Summarize files changed, verification
performed, unresolved issues, and next recommended task.

## Critical framework rule

Expo has changed. This repository currently targets Expo SDK 57-era
packages.

Before writing Expo-specific code, verify the exact installed package
versions in `package.json` and consult the matching versioned Expo
documentation: https://docs.expo.dev/versions/v57.0.0/

Do not blindly apply older Expo/React Native tutorials.

## Current technical baseline

At the time this file was prepared, the repository uses:
- React Native
- Expo / Expo Router (Expo SDK 57-era)
- TypeScript
- NativeWind / Tailwind CSS
- React 19
- React Native 0.86
- `expo-location`
- Supabase (`@supabase/supabase-js`, `expo-sqlite` persistent session storage)

**CRITICAL INFRASTRUCTURE RULE: DOCKER IS SKIPPED COMPLETELY**
- Do NOT use Docker, Docker Desktop, or containerized local Supabase stacks (`supabase start`).
- All backend work directly targets the remote/hosted Supabase project configured via `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- Migrations and schema changes are pushed to or executed on the remote Supabase project.
- Quality gates and tests run natively in Node / Expo without local Docker dependencies.

Always verify this list against `package.json` before relying on it.

## Product roles

Keep these experiences distinct while sharing domain models and services
where appropriate: - Guest customer - Registered customer -
Merchant/store staff - Independent rider - System administrator

A role-specific UI must not become a substitute for authorization. Real
permissions belong in authenticated backend/RLS policies.

## Core customer journeys

Protect these flows from regressions: 1. Guest opens MFF -\> discovers
food/restaurants without forced registration. 2. Customer
searches/browses -\> restaurant -\> menu/dish -\> cart/checkout -\>
fulfillment -\> order confirmation -\> tracking -\> delivery completion.
3. Customer discovers restaurant -\> chooses reservation slot -\>
submits booking -\> merchant confirms/declines -\> customer receives
status. 4. Customer explores map -\> selects nearby establishment -\>
opens restaurant/details. 5. Registered customer uses community -\>
posts/comments/reacts with moderation/reporting capability once backend
exists. 6. Customer explicitly opts into personalization -\> eligible
events are recorded -\> recommendations use consented data. 7. Merchant
signs in -\> sees operational order queue first -\>
accepts/prepares/marks ready -\> manages availability/menu/reservations.
8. Rider signs in -\> goes online -\> sees eligible jobs -\> accepts one
atomically -\> pickup -\> delivery -\> COD/PIN proof -\> completion. 9.
System admin authenticates -\> performs approvals/moderation/platform
administration through real role-based authorization.

## Architectural direction

Prefer this dependency direction:

`screen/route -> feature hook/controller -> domain/service/repository -> backend`

UI components should not own business rules that must be shared across
customer, merchant, rider, and admin experiences.

Recommended logical boundaries: - `app/` --- Expo Router routes and
layouts; keep route files thin. - `components/` --- reusable
presentational UI. - `features/` --- feature-specific UI +
hooks/controllers where useful. - `types/` or `domain/` --- canonical
domain types and state machines. - `services/` --- backend/API,
location, routing, storage, notifications. - `repositories/` --- data
access abstraction if/when complexity justifies it. - `mock/` ---
prototype fixtures only; never mix them with production persistence. -
`lib/` --- configured clients and small cross-cutting utilities. -
`docs/` --- architecture/product documentation.

Do not perform a massive folder rewrite merely to match this list.
Refactor incrementally around real feature work.

## Canonical domain models

There must eventually be one authoritative model for each core
concept: - User/Profile - Role - Store/Restaurant - StoreHours - Menu -
MenuItem - Cart - Order - OrderItem - OrderStatus - Delivery -
DeliveryStatus - Rider - Reservation - ReservationStatus - Address -
Payment/COD settlement - Notification - CommunityPost -
Comment/Reaction - Visit/Check-in - PersonalizationConsent

Do not create duplicate incompatible versions of the same concept in
different screens.

## Order state machine

Use one canonical order vocabulary across customer, merchant, rider,
admin, database, notifications, and tests.

Current intended baseline: - `placed` - `accepted` - `preparing` -
`ready_for_pickup` - `out_for_delivery` - `delivered` - `cancelled`

Do not silently add/rename statuses. If the state machine must change,
update the type, transitions, persistence schema, UI mappings, tests,
`progress.md`, and relevant documentation together.

Transitions must be validated. A UI button should not be able to jump an
order through impossible states.

## Reservation semantics

Never tell the customer a reservation is "confirmed" immediately after
creating a request unless the merchant/system has actually confirmed it.

Use clear states such as: - pending - confirmed - declined - cancelled -
completed - no_show

Only introduce new states when backend and UI behavior are defined.

## Delivery/COD integrity

Delivery jobs are shared platform jobs for eligible independent riders,
subject to store delivery settings.

Production behavior must eventually include: - atomic rider job claim -
server-authoritative order/delivery state - pickup verification -
customer handoff proof (PIN and/or approved proof mechanism) - COD
amount and settlement records - idempotent completion - audit trail -
retry/offline behavior where appropriate

Never trust client-only state for money, delivery completion, or
authorization.

## Authentication and security

Prototype login helpers, dev credentials, public passphrases, or
`EXPO_PUBLIC_*` values are not security boundaries.

For the active Supabase migration:
- **Real Supabase Auth is authoritative**: Use `@supabase/supabase-js` auth methods (`signUp`, `signInWithPassword`, `signOut`, `verifyOtp`, `resetPasswordForEmail`).
- **Real registrations & sign-ins**: Customer, merchant, and rider registration flows must create actual Supabase Auth accounts and corresponding database rows (`profiles`, `store_memberships`, `platform_roles`).
- **Real sessions**: Sessions must be managed by `SessionContext.tsx` and persisted via `expo-sqlite` on native platforms and `localStorage` on web. Respect session recovery and refresh cycles on app state changes.
- **Decommission demo credentials**: Eliminate mock credentials (such as `lette@karenderia.com` or hardcoded rider bypasses) in production routes.
- **Enforce roles server-side**: Use Supabase Row Level Security (RLS) policies and security-definer helper functions. Client UI routing is not an authorization boundary.
- **Least privilege**: Never expose service-role keys or database credentials in Expo bundles or client code.
- **Guest discovery preserved**: Unauthenticated guests can browse restaurants and menus freely; prompt for authentication via `GuestGateModal` or sign-in screens when initiating orders, reservations, check-ins, or profile actions.

Do not weaken security to make a demo work.

## State management

`AuthContext` and `SessionContext`:
- `SessionContext` manages the authoritative Supabase authentication session, token lifecycle, and current profile/roles.
- `PrototypeDataContext` serves only as a temporary transition bridge for non-migrated mock data (orders, reservations, notifications) and must not own authentication.
- As each domain (stores, menus, orders, reservations, community) migrates to Supabase, remove it from `PrototypeDataContext` and consume backend services/hooks directly.

Use server state tooling only when justified by the real backend. Avoid
adding libraries without a concrete need.

## Data and backend rules

Hosted Supabase backend rules:
- **No Docker**: Target the remote/hosted Supabase instance directly.
- **Migrations in version control**: Database migrations live in `supabase/migrations/`. Apply them to remote Supabase via Supabase CLI (`supabase db push`) or the Supabase SQL editor.
- **Row Level Security (RLS)**: Every public table must have RLS enabled with explicit SELECT, INSERT, UPDATE, and DELETE policies.
- **TypeScript database types**: Maintain `types/database.ts` aligned with the remote Supabase schema.
- **PostGIS for geographic data**: Store restaurant coordinates as PostGIS `geography(Point, 4326)` with spatial indexes.
- **Client UI never authoritative**: Pricing, order totals, order statuses, rider assignment, and payment settlements must be calculated or validated server-side.

## UI/UX quality bar

Aim for the coherence of a mature consumer app, without copying another
company's trade dress.

Requirements: - one design token system for brand colors, typography,
spacing, radii, shadows, and semantic states - consistent components for
buttons, inputs, sheets, cards, badges, empty/error/loading states -
predictable navigation and back behavior - clear primary action per
screen - skeleton/loading states for network content - explicit empty,
offline, permission-denied, and error states - accessible labels, touch
targets, contrast, and dynamic text behavior - keyboard-safe forms -
safe-area correctness - responsive layouts across supported mobile/web
sizes - avoid modal-on-modal interaction chains - real food/store
imagery should use an intentional image system with fallbacks, caching,
and aspect-ratio rules - avoid emoji as final production visual assets
for core restaurant/menu imagery

Do not "polish" by adding random gradients, shadows, colors, badges, or
animations. Consistency beats decoration.

## Brand consistency

The repository currently contains orange-led customer surfaces and
emerald/green-heavy legacy surfaces. Consolidate this intentionally.

Before broad visual refactors, define reusable semantic tokens such
as: - brand primary - brand secondary/accent - surface/background - text
primary/secondary - success - warning - danger - info - border/divider

Do not hardcode new one-off color systems in individual screens unless
required by a specific data visualization.

## Performance

For long/dynamic feeds and restaurant/menu lists: - prefer
`FlatList`/`SectionList` over large `ScrollView` maps - memoize only
when measurement or render behavior justifies it - avoid expensive
calculations during every render - paginate backend feeds -
optimize/cache images - avoid loading the entire marketplace dataset at
once - clean up subscriptions/listeners

Measure before doing speculative micro-optimization.

## Location and routing

Straight-line Haversine distance is useful as an estimate, not a driving
route.

Production discovery/delivery should distinguish: - GPS/device
position - geographic straight-line distance - road route
distance/time - delivery serviceability zones - store delivery
radius/rules

Never label straight-line distance as actual travel time.

## Community

Before treating community as production-ready, add: - backend
persistence - authorization - reporting - moderation/admin workflow -
abuse/spam controls - content deletion/ownership rules - pagination -
image/media policy if media is supported

## Personalization/privacy

Personalization must be opt-in and understandable.

Do not claim "ML" merely because a deterministic "most visited"
heuristic exists. Name prototype heuristics accurately.

Track only events needed for defined product outcomes. Support consent
changes and data deletion/retention rules when backend implementation
begins.

## Error handling and observability

Production features need: - user-safe error messages - structured
internal errors - no secret/PII leakage - crash/error reporting
strategy - meaningful analytics events - server-side audit events for
sensitive operations

Do not swallow exceptions without a deliberate fallback.

## Testing and verification

Before declaring a task complete, run the automated checks available for the affected area.

**Executable without Docker (Standard verification suite):**
- `npm run typecheck` — TypeScript static analysis across the entire project.
- `npm test` — Unit tests for client configuration, lifecycle, env validation, and session stores (`tests/foundation/*.test.ts`).
- `npm run check` — Combined typecheck and unit tests (`npm run typecheck && npm test`).
- `npm run check:client-bundle` — Probes client bundle resolution for Android and iOS.
- `npx expo export --platform all --max-workers 2` — Sanity check for mobile and web production bundling.

**Docker-dependent scripts are DEPRECATED / SKIPPED:**
- Do NOT run `npm run db:start`, `npm run db:lint`, `npm run db:test`, or `npm run test:auth:local`. These require a local Docker daemon which is intentionally skipped.

Never claim a command passed unless it was actually run.

## Change discipline

-   Inspect before editing.
-   Make the smallest coherent change that solves the problem.
-   Do not rewrite unrelated working areas.
-   Do not delete functionality to make errors disappear.
-   Preserve user-visible behavior unless the task explicitly changes
    it.
-   Avoid `any`; model data precisely.
-   Remove dead code after migrations/refactors.
-   Keep commits/features reviewable.
-   Explain migrations and breaking changes before applying them.
-   If requirements conflict, stop and identify the conflict.

## Git safety

Before work: - inspect `git status` - do not overwrite uncommitted user
work - do not reset/revert unrelated changes - do not force-push - do
not commit secrets - do not create a commit unless explicitly requested

At end of work, report uncommitted changes clearly.

## Documentation memory policy

`progress.md` is durable project memory, not a diary.

Update it after meaningful sessions with: - verified current state -
completed work - important decisions - known issues/technical debt -
verification results - next tasks

Keep it concise. Remove stale statements when code has superseded them.

`goal.md` defines product direction, milestones, priorities, and
acceptance criteria. Do not fill it with session logs.

## Definition of done

A feature is not done because the happy-path screen looks correct.

For meaningful production-oriented features, done means: - behavior
matches requirements - types/domain state are coherent -
authorization/security implications considered - loading/empty/error
states handled - relevant platforms checked - verification performed -
no known regression introduced - docs/project memory updated - remaining
limitations stated explicitly
