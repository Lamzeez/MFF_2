# Supabase foundation

## Status and scope

This additive foundation was verified against local Supabase on 2026-09-30. All three
migrations applied, public/private database lint passed, and all 63 pgTAP assertions
passed. `types/database.ts` is generated from the applied schema; the type drift check,
TypeScript check and eight client unit tests passed. No hosted project has been linked
or changed. CI has not run remotely, and device Auth integration remains future work.

Local limitation: Vector's Docker log source reports connection refused and its container
restarts. Database/Auth services are healthy and SQL checks pass; Studio log ingestion
is not verified. Inspection confirmed the CLI configured its Docker source as
`http://host.docker.internal:2375`, with no socket mount. This matches the Windows TCP
daemon dependency in the [Supabase CLI setup documentation](https://supabase.com/docs/guides/local-development/cli/getting-started).
No Docker daemon exposure/settings were changed to work around this. Individual service
logs remain accessible through Docker Desktop or `docker logs <container-name>`.

The application still runs on its original mock data and prototype AuthContext.
Neither real sign-in nor catalog queries are connected to screens. The foundation
does not make the current login/admin/PIN mock flows production-secure.

Approved scope: six tables, Auth-linked profiles, store-scoped permissions, RLS,
PostGIS store coordinates, migrations, client/environment infrastructure, type preparation,
tests and CI. Orders, inventory, delivery, COD, reservations, addresses, menus/schedules,
community, notifications, media uploads and personalization are deferred.

## Runtime and environment

Verified dependency baseline: Expo 57.0.21, React Native 0.86.3, React 19.2.3,
Expo Router 57.0.20, TypeScript 6.0.3. Added Supabase JS 2.117.2, Expo SQLite 57.0.3,
Supabase CLI 2.118.0 and tsx 4.23.15. The lockfile pins the installed dependency graph.

Copy `.env.example` to ignored `.env.local` and supply:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

These are public configuration. **Never put an `sb_secret_*`, service-role JWT,
database password or CLI access token in Expo environment/configuration.** The parser
accepts only modern `sb_publishable_*` keys, not legacy JWT keys. Use the local stack's
publishable key for local testing; do not substitute its service-role credential.

`app.config.js` validates provided configuration before bundling and preserves app.json.
Both variables absent is permitted for the existing mock app. Partial/invalid configuration
fails explicitly. Calling the backend getter without configuration also fails explicitly;
there is no fallback from a failed backend request to mock success. Error text omits values.

HTTPS origins are required except explicit local development hosts: localhost, 127.0.0.1,
IPv6 loopback and Android emulator host 10.0.2.2. A physical phone needs a reachable HTTPS
development endpoint; arbitrary HTTP LAN origins are not enabled. Do not commit real
local configuration. Environment validation is accident prevention, not authorization.

## Client boundary

- Import `getSupabaseClient` from `lib/supabase/client`; Metro chooses `.native.ts` on mobile.
- Client construction is lazy and singleton per runtime. No screens call it yet.
- Native: Expo SQLite localStorage persists sessions. This is **not encrypted storage**.
- Web: browser localStorage, explicit failure if unavailable; no singleton server session.
- `detectSessionInUrl: false`, PKCE configured. No auth callback route is implemented yet.
- When real Auth is wired, mount `bindNativeAuthLifecycle(client.auth, AppState, onError)`
  once in the native auth provider and run its returned cleanup on unmount. Native refresh
  is deliberately off until this lifecycle is bound. The helper serializes refresh calls
  and tolerates cleanup/immediate remount without racing a previous shutdown.
- Never use prototype `loginAsRegistered` to establish backend identity.

Local Auth config keeps email confirmation enabled, disallows anonymous Auth signup, and
reserves exact `mff://auth/callback` and localhost callback URLs. Implement and verify
confirmation/recovery callbacks during the Auth feature migration before enabling them
in user-facing flows. Session persistence/refresh still needs device integration testing.

## Schema and domain contracts

| Table | Relationship and purpose |
| --- | --- |
| public.profiles | id -> auth.users; private display/contact fields, active/suspended state |
| private.platform_roles | user_id -> profiles; protected admin/rider assignments |
| public.stores | public details, unique stable slug, approval/archive state, optional geography |
| public.store_memberships | (store_id, user_id) primary key; owner/manager/staff, active flag |
| public.menu_items | store_id -> stores; stable identity, PHP centavos, publication/availability/archive |
| private.access_audit_events | immutable access-change history; actor ID and database actor |

Identity and timestamps are server generated. Account creation triggers a profile with
neutral defaults; signup metadata cannot set roles/status. Existing auth users are
backfilled additively. The first migration is intended for a project without conflicting
MFF table names; inspect any existing hosted schema before applying it.

`types/auth.ts` and `types/restaurant.ts` derive backend aliases from `types/database.ts`.
Their old form/presentation contracts remain for mock consumers, explicitly labeled.
Do not persist form passwords, client approval states, pesos or formatted display values
as if they were database rows. DB Insert/Update types describe structure, not permissions;
the narrower edit aliases and database column grants define intended client writes.

Store and item IDs cannot be reassigned through client grants. There is no duplicate
`owner_id`, global merchant grant, or global customer grant. Guest is no session, customer
is an active permanent account, merchant derives from membership, admin/rider are explicit
protected assignments. A user may hold several capabilities.

## Authorization rules

All six tables enable RLS; migrations explicitly revoke broad client grants and restore
only required ones. The Data API exposes `public` only, never `private`. Schema USAGE on
private allows policy helpers, not direct private-table access.

| Actor | Read | Write |
| --- | --- | --- |
| Guest | Approved, unarchived stores; published, unarchived items under those stores | None |
| Customer | Public catalog and own profile | Own display name/contact phone while active |
| Store staff | Public catalog, own store items (including drafts), own membership | None |
| Owner/manager | Own catalog and store roster | Allowed store fields and item creation/edit/archive |
| Rider | Customer access plus rider capability | No merchant privilege |
| Admin | Catalog and membership inspection | Restricted access/approval RPCs; no raw role/audit writes |

Even admins cannot directly read other private profiles through the public profile API.
Suspended/banned accounts lose private store access and mutations, but retain their own
profile read and the catalog any guest can see. Anonymous Auth users do not receive
permanent customer capabilities. Sold-out items can remain public; availability is not
publication permission. Pending/rejected stores may prepare their catalog but remain private.
Archived stores cannot be edited by members. Staff writes await a defined operational role.

RLS helpers are SECURITY DEFINER, fixed-search-path, explicitly granted and current-user
scoped to avoid recursive membership policies. No role authorization uses editable JWT
user metadata. Trusted database roles remain privileged; no client key can act as one.

Administrative RPCs: `admin_create_store`, `admin_set_store_approval`,
`admin_set_store_archived`, `admin_set_store_membership`, `admin_set_platform_role`,
`admin_set_account_status`. Every one rechecks current admin authority in the database.
`get_my_application_roles` exposes only the current caller's effective capabilities.

Access administration is serialized with a transaction advisory lock. Membership changes
also lock the parent store. A deferred constraint prevents unarchived stores from losing
their final active owner membership; create-store inserts store and owner atomically.
Transfer by adding a new owner before removing/demoting the old owner, or archive the store
first. Suspending an owner account does not silently transfer ownership or deactivate its
membership. Last-administrator removal/suspension is refused by the administrative RPCs.
Concurrent execution guarantees still require live database validation.

Access audit triggers record changed authority fields only, not full profile/contact rows.
API clients cannot read/write these records. Update/delete/truncate is blocked even through
ordinary privileged DML. Trusted SQL bootstrap has a null JWT actor and a database actor.
Database superusers can change schema/disable triggers; this is not external tamper-proof storage.

## First admin bootstrap (trusted operator only)

Create and verify a real Auth account first. In the chosen database's trusted SQL console,
confirm its UUID and permanent/active status, then run a reviewed one-time transaction:

```sql
begin;
insert into private.platform_roles(user_id, role)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid, 'admin')
on conflict (user_id, role) do nothing;
commit;
```

This is not an Expo/client operation, not an automated production seed, and has not been
executed. Subsequent grants go through the audited admin RPCs. Never use the prototype
admin passphrase as authorization for these calls.

## Local verification and generated types

Prerequisites: Node 24, installed locked dependencies, Docker Desktop running Linux
containers. Existing dependencies need no reinstall; use `npm ci` only for a clean setup.

On this Windows machine Docker is installed per-user. If a terminal predates installation
and cannot find `docker`, open a new terminal or add its directory for that session:

```powershell
$env:PATH = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin;" + $env:PATH
docker version
```

```sh
npm run check
npm run check:client-bundle
npx expo export --platform all --output-dir dist/app-check --max-workers 2
npm run db:start
npm run db:lint
npm run db:test
npm run db:types
npm run db:types:check
npm run typecheck
```

The local project ID is `mff-foundation`, using PostgreSQL 17. `db:start` on a fresh stack
applies ordered migrations. On an existing stack, inspect migration history and apply new
local migrations deliberately; do not assume start reapplies edits to previously applied
migrations. No reset script is provided. Any reset or destructive/hosted schema operation
requires an explicit review of its target and impact first.

Migration order: identity/access tables -> catalog/PostGIS/RLS -> restricted admin operations.
Fixtures live only in the transactional pgTAP test, which rolls back. No production seed.
Database lint includes public and private functions. The type generator targets only the
local public schema, captures CLI output without shell redirection, and preserves the
previous file on failure. It normalizes line endings and trailing whitespace for stable
comparisons. Review the generated diff whenever migrations change.

The CI client job runs TypeScript/unit tests, native foundation-client bundles and full app
exports. The database job starts an isolated local stack and runs lint, RLS tests and type
drift checks. No hosted secrets or deployment permissions are required. CI has been added,
not run remotely. A red DB/type job is a blocking gate, not a reason to weaken policies.

pgTAP covers public/private visibility, profile bootstrap, spoofed signup roles, cross-user
and cross-store writes, staff restrictions, protected columns, money constraints, publication
vs availability, suspended accounts, role/membership revocation, last-owner/admin protection,
and audit attribution. It is not a concurrent transaction/load test or a full Auth API test.

## Deferred decisions before feature migrations

- Orders: keep the existing status vocabulary, resolve pickup completion explicitly, and
  never map prototype `confirmed` blindly to merchant `accepted`. Preserve item/address/price
  snapshots and validate transitions server-side.
- Reservations: pending requests, real timestamps/timezone, capacity and conflict rules.
- Rider jobs: transactional conditional claim, assignment constraints, idempotent completion,
  reassignment history and protected PIN verification. RLS alone is insufficient.
- Inventory: `is_available` is a manual flag, not stock; design finite daily inventory and
  atomic reservation/release with order creation before taking real orders.
- COD: separate amount due, collection, rider compensation, merchant payable and settlement.
  No speculative wallet balance or assumption that delivery fee equals rider earnings.
- Geography: optional geography(Point,4326), GiST index, longitude-first coordinates.
  Future radius queries must use index-supported predicates; proximity is not a road ETA.
- Account erasure: restrictive FKs intentionally prevent deleting linked identities/catalog
  without a designed retention/anonymization process. Audit actor IDs have no cascading FK.
- Store hours, daily menus, personal addresses, media and consent need feature-specific migrations.

Official references: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Expo Supabase setup](https://docs.expo.dev/guides/using-supabase/),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PostGIS](https://supabase.com/docs/guides/database/extensions/postgis),
[generated types](https://supabase.com/docs/guides/api/rest/generating-types).
