# Spec: Multi-Tenant Conversion — Salini Quotation Generator

## 0. Context for the agent

This is a **migration spec**, not a greenfield build. The app at `Gautham248/salini-quotations` (local path `~/LeedsDigital/Projects/Salini-QuotationGenerator/salini-quotation-generator`) is a working single-tenant Next.js 16 + NextAuth (JWT sessions) + Prisma 7 (SQLite via `@prisma/adapter-libsql`) quotation generator, currently live for one company ("SALINI TRADERS"). It has 19 commits of real feature work: item catalog with units/unit-conversions/categories, quotation builder with line items, PDF generation (jsPDF), quotation-number sequencing, document locking, and a two-role (`admin`/`staff`) permission model.

The client now wants this deployed across **3–4 separate stores**, each with its own address/GSTIN/bank details, its own admin and staff users, and its own quotation numbering — plus a new **superadmin** role that sits above all stores.

**Do not start from scratch.** Read `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/auth-guards.ts`, and every file under `src/app/api/` before writing any code, so every existing model, route, and permission check is accounted for in the migration rather than guessed at.

**Adversarial verification is mandatory for this task** (per this project's usual standard): after implementation, grep for every Prisma query against `MasterItem`, `Quotation`, `Category`, `Unit`, `CompanySettings`, and `User` across the whole `src/` tree and confirm each one is either correctly store-scoped or deliberately global (catalog reads), with a written note on which. An unscoped query on a tenant-owned model is a data leak between stores, not a style nit — treat it as a bug of the same severity as an auth bypass.

## 1. Goals

- Each of 3–4 stores operates as if it has its own private instance of this app: own quotations, own quotation numbering starting at 1, own staff/admin accounts, own letterhead (name/address/phone/GSTIN/bank details) on generated PDFs.
- Admins and staff can only ever see and act on data belonging to their own store — enforced at the query layer, not just hidden in the UI.
- A new **Super Admin** role can see and manage everything across all stores: create/edit/deactivate stores, create/edit/deactivate any user in any store (including store admins), view any store's quotations and master catalog.
- The item catalog (descriptions, units, categories) stays shared across all stores (single source of truth for "what products exist"), but **rate is store-specific** — each store can charge a different price for the same catalog item, defaulting to a base rate if it hasn't set its own.
- No regressions to existing single-store functionality: quotation builder, live preview, PDF generation, draft autosave, document locking must all continue working exactly as they do today, just store-scoped.

## 2. Non-Goals

- Cross-store reporting/analytics dashboards (super admin gets list/filter views, not BI — flag as a future nice-to-have).
- Store-specific catalog items (a store wanting an item that literally doesn't exist for other stores) — out of scope for v1; if this comes up later it's an additive feature (a `storeId` nullable column on `MasterItem` for store-private items), not a redesign.
- Moving off SQLite. Multi-tenant SQLite via `@prisma/adapter-libsql` is fine at this scale (3–4 stores, single-digit users per store) — do not migrate to Postgres as part of this task.
- Store-level custom branding/theming of the UI itself (only the generated PDF letterhead is store-specific — the app's own UI chrome stays the same for everyone).
- Billing/subscription logic between stores and the platform owner.

## 3. Roles (revised)

Three roles now, up from two:

| Role | Scope | Can do |
|---|---|---|
| `superadmin` | All stores | Create/edit/deactivate stores. Create/edit/deactivate any user (any role, any store). View/manage master catalog (shared). View any store's quotations (read-only across stores; see 3.1 on whether superadmin can create quotations). Everything a store `admin` can do, for any store. |
| `admin` | One store (own) | Everything staff can do, scoped to own store. Manage own store's users (create/deactivate staff and admin accounts within their own store only — cannot create other admins for other stores). Set own store's rate overrides on catalog items. Edit own store's `CompanySettings` (address, GSTIN, bank details, etc.) — **new capability, doesn't exist today** since `CompanySettings` is currently unauthenticated-singleton; confirm whether store admin should self-serve this or whether only superadmin sets it up at store-creation time (see Section 9, open question). |
| `staff` | One store (own) | Create/edit/finalize quotations for own store only. Browse shared catalog with own store's rates applied. Cannot manage users, cannot manage catalog, cannot edit store settings. Same as today's `staff` behavior, just store-scoped. |

### 3.1 Open design question flagged, not decided
Should `superadmin` be able to *author* quotations directly for a store (e.g., stepping in to help), or is `superadmin` strictly an oversight/management role that views but doesn't create quotations? Recommend: **superadmin can create/edit quotations for any store** (simpler permission model — superadmin is a strict superset of admin, no special-cased restrictions) unless you say otherwise. Building it as a strict superset also means less new permission-check code.

## 4. Data Model Changes

### 4.1 New model: `Store`

```prisma
model Store {
  id          Int      @id @default(autoincrement())
  name        String                          // internal/display name, e.g. "Salini Traders - Pala"
  slug        String   @unique                // URL-safe identifier, e.g. "salini-pala" — used in routes/subdomain if applicable (see 8.2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  users             User[]
  quotations        Quotation[]
  settings          CompanySettings?
  quotSequence      StoreQuotSequence?
  itemRateOverrides ItemStoreRate[]
}
```

### 4.2 `User` — add store relation

`superadmin` users have `storeId = null` (not scoped to a store). `admin`/`staff` users **must** have a `storeId`. Enforce this with an application-level check (Prisma doesn't support conditional-required-FK natively) at user-creation time, not just a nullable column left to chance.

```prisma
model User {
  id                  Int          @id @default(autoincrement())
  username            String       @unique   // keep global uniqueness — simplest; see 9 for alternative
  passwordHash        String
  role                String                  // now one of: "superadmin" | "admin" | "staff"
  store               Store?       @relation(fields: [storeId], references: [id])
  storeId             Int?                     // null only when role == "superadmin"
  isActive            Boolean      @default(true)
  forcePasswordChange Boolean      @default(false)
  createdAt           DateTime     @default(now())
  quotations          Quotation[]  @relation("CreatedBy")
  createdItems        MasterItem[] @relation("ItemCreatedBy")
  updatedItems        MasterItem[] @relation("ItemUpdatedBy")
  createdUnits        Unit[]       @relation("UnitCreatedBy")
}
```

### 4.3 `CompanySettings` — from singleton to per-store

Today this is an unauthenticated singleton (implicitly one row, no FK to anything). Change to one row per store, keyed by `storeId`, unique:

```prisma
model CompanySettings {
  id             Int      @id @default(autoincrement())
  store          Store    @relation(fields: [storeId], references: [id])
  storeId        Int      @unique
  companyName    String
  subheading     String
  phone          String
  mobile         String
  email          String
  gstin          String
  bankDetails    String
  disclaimerText String   @default("Certified that the particulars given above are true and correct.")
  loadingNote    String   @default("LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA")
  updatedAt      DateTime @updatedAt
}
```
Note: dropped the hardcoded `@default(...)` values that currently bake in "SALINI TRADERS" / its specific address / GSTIN / bank details — those become required fields set explicitly per store at store-creation time (see 6.1), not silent defaults that could leak one store's real bank account onto another store's PDF if a field is accidentally left unset.

### 4.4 `Quotation` — add store relation, fix quotNo uniqueness

```prisma
model Quotation {
  id              Int                  @id @default(autoincrement())
  store           Store                @relation(fields: [storeId], references: [id])
  storeId         Int
  quotNo          String                              // no longer globally @unique
  refNo           String
  quotDate        DateTime
  status          String
  customerName    String
  customerAddress String?
  customerPlace   String?
  customerGstin   String?
  deliveryTerms   String?
  gstNote         String?
  validity        String               @default("LIMITED")
  paymentTerms    String               @default("READY PAYMENT")
  subTotal        Float?
  cgst            Float?
  sgst            Float?
  roundOff        Float?
  netAmount       Float?
  amountInWords   String?
  isLocked        Boolean              @default(false)
  createdBy       User                 @relation("CreatedBy", fields: [createdById], references: [id])
  createdById     Int
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  finalizedAt     DateTime?
  lineItems       QuotationLineItem[]

  @@unique([storeId, quotNo])   // uniqueness is now per-store, not global
}
```
**Critical**: `src/lib/quot-no.ts` currently generates a number guaranteed globally unique. This must change to generate a number unique *within the store*. Read the actual current implementation of `quot-no.ts` before changing it — the existing code already solved one hard problem here (the commit history shows `947a446 feat: add ... quotNo collision avoidance`, meaning there was a real concurrency bug fixed before), so the store-scoped version must preserve whatever concurrency-safety mechanism that fix introduced, just re-keyed by store. Do not regress a previously-fixed race condition while adding store scoping.

### 4.5 `QuotSequence` → per-store

The existing `QuotSequence` model (`{ id, dummy Int @unique }`) is a singleton-row locking pattern, almost certainly used to serialize the number-generation transaction (e.g., row-level lock via a single dummy row). Replace with a per-store equivalent:

```prisma
model StoreQuotSequence {
  id      Int   @id @default(autoincrement())
  store   Store @relation(fields: [storeId], references: [id])
  storeId Int   @unique
}
```
One lock row per store, so concurrent finalize operations across *different* stores don't block each other (no reason for Store A's quotation-number generation to contend with Store B's), while concurrent finalizes *within* the same store still serialize correctly. Read `quot-no.ts` to confirm exactly how the existing `dummy` column is used in the transaction before reimplementing — replicate the same locking technique, just scoped.

### 4.6 `MasterItem` stays global; new `ItemStoreRate` for per-store pricing

Per your confirmed answer (shared catalog, store-specific rate overrides), `MasterItem` itself is **not** store-scoped — no `storeId` added to it, `description`/`unit`/`gstPercent`/`weightPerUnit`/`piecesPerUnit`/`categories` all stay global and shared. Only rate becomes overridable:

```prisma
model MasterItem {
  id            Int                  @id @default(autoincrement())
  description   String
  unit          Unit                 @relation(fields: [unitId], references: [id])
  unitId        Int
  rate          Float                                 // base/default rate — used when a store has no override
  gstPercent    Float
  weightPerUnit Float?
  piecesPerUnit Int?
  isActive      Boolean              @default(true)
  createdBy     User                 @relation("ItemCreatedBy", fields: [createdById], references: [id])
  createdById   Int
  updatedBy     User                 @relation("ItemUpdatedBy", fields: [updatedById], references: [id])
  updatedById   Int
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  lineItems     QuotationLineItem[]
  categories    ItemCategory[]
  storeRates    ItemStoreRate[]
}

model ItemStoreRate {
  id           Int        @id @default(autoincrement())
  masterItem   MasterItem @relation(fields: [masterItemId], references: [id], onDelete: Cascade)
  masterItemId Int
  store        Store      @relation(fields: [storeId], references: [id], onDelete: Cascade)
  storeId      Int
  rate         Float
  updatedAt    DateTime   @updatedAt

  @@unique([masterItemId, storeId])
}
```
**Resolution rule** (must be implemented as a single shared helper function, not duplicated inline wherever rate is read): effective rate for a given item at a given store = `ItemStoreRate.rate` if a row exists for that `(masterItemId, storeId)` pair, else fall back to `MasterItem.rate`. This resolution must happen in exactly one place (e.g. `src/lib/item-rates.ts`) and be used by both the item picker (staff browsing catalog) and any place that re-reads a master item's current rate — the quotation-line-item snapshot behavior (copy rate into the line at time of adding) stays as-is per the original PRD, this only changes *what rate gets snapshotted*.

Who manages overrides: `admin` (own store only) and `superadmin` (any store). `staff` never sets rate overrides, only sees the resolved effective rate.

### 4.7 `Category`, `Unit`, `UnitConversion`, `ItemCategory` — unchanged, stay global
These describe the shared catalog's taxonomy and unit system. No `storeId` needed. Confirm this matches intent: all stores see the same category list and unit list. (If a store wants to hide a category it doesn't use, that's a filter/UI concern, not a schema one — out of scope for v1.)

## 5. Session / Auth Changes

### 5.1 `src/lib/auth.ts`
`authorize()` currently returns `{ id, name, role }`. Must also return `storeId` (nullable, null for superadmin) so it's threaded through the JWT and session:

- Update the `authorize` callback's return value to include `storeId: u.storeId`.
- Update `declare module "next-auth"` type augmentation: add `storeId: number | null` to both the `Session.user` and `User` interfaces.
- Update `declare module "next-auth/jwt"`: add `storeId: number | null` to the `JWT` interface.
- Update the `jwt` callback to copy `user.storeId` onto `token.storeId`.
- Update the `session` callback to copy `token.storeId` onto `session.user`.

After this change, every server-side handler that calls `auth()` has `session.user.storeId` available alongside `session.user.role` — this is the value every store-scoped query filters on.

### 5.2 `src/lib/auth-guards.ts` — add new guards, don't just extend existing ones

Current file only has `getSession`, `requireAuth`, `requireAdmin`. Needs:

```typescript
export async function requireSuperAdmin() {
  const s = await requireAuth();
  if (s.user.role !== "superadmin") redirect("/quotations");
  return s;
}

// requireAdmin should now accept BOTH "admin" and "superadmin" (superadmin is a superset — see 3.1)
export async function requireAdmin() {
  const s = await requireAuth();
  if (s.user.role !== "admin" && s.user.role !== "superadmin") redirect("/quotations");
  return s;
}

// New: resolves which storeId a request should be scoped to.
// For admin/staff, always their own storeId (ignore any client-supplied value — never trust a storeId from the request body/query for these roles).
// For superadmin, storeId comes from the request (route param or query string) since they operate across stores.
export async function resolveStoreId(request?: Request): Promise<number | null> {
  const s = await requireAuth();
  if (s.user.role === "superadmin") {
    // read storeId from request params/query — superadmin must explicitly select a store context for store-scoped actions
    // return null only for genuinely cross-store views (e.g. the store list itself)
  }
  return s.user.storeId; // admin/staff: always their own, never overridable by request input
}
```

**This `resolveStoreId` — or an equivalent — must be the single choke point every API route uses to determine which store's data to query.** Do not let individual routes independently decide "use `session.user.storeId`" vs "use a `storeId` from the request body" — that inconsistency is exactly how a cross-tenant data leak or privilege escalation would slip in (e.g., a staff member crafting a request with someone else's `storeId` in the body). The rule is simple and must be applied uniformly: **for `admin`/`staff`, the store is always taken from the session, never from client input, full stop.**

## 6. API Route Changes

Read every file under `src/app/api/` before touching any of them — the list below is what's known from the file tree, confirm against actual route logic since request/response shapes matter for the frontend too.

### 6.1 New: `src/app/api/stores/route.ts`, `src/app/api/stores/[id]/route.ts`
Superadmin-only (`requireSuperAdmin()`). CRUD for `Store`. Creating a store should, in one transaction:
1. Create the `Store` row.
2. Create its `CompanySettings` row (superadmin provides name/address/phone/GSTIN/bank details at creation — see Section 3, open question about whether store admin can later edit these themselves).
3. Create its `StoreQuotSequence` lock row.
4. Optionally create the store's first `admin` user in the same flow (better UX than a separate step — recommend doing this, confirm with client if a two-step flow is preferred instead).

### 6.2 `src/app/api/users/route.ts` and `[id]/route.ts`
- List: superadmin sees all users (optionally filterable by store); admin sees only users where `storeId == session.user.storeId`.
- Create: admin creating a user must force `storeId = session.user.storeId` and can only set role to `admin` or `staff` (never `superadmin`). Superadmin can create any role for any store (superadmin creation should require `storeId = null` explicitly, not accidentally allow a stray value).
- Update/deactivate: admin can only modify users within their own store; attempting to modify a user in a different store must 403, not just filter them out of a list (verify this with a direct API call in testing, not just by checking the UI doesn't show the option).

### 6.3 `src/app/api/items/route.ts` and `[id]/route.ts`
- Catalog CRUD (description/unit/gstPercent/etc.) stays admin/superadmin-accessible, and per 4.7 remains global — not store-filtered for these fields.
- **New behavior needed**: an endpoint (or extension of the existing GET) for reading items **with the requesting store's effective rate resolved in** (per 4.6's resolution rule) — this is what the staff item-picker (`src/components/items/item-picker.tsx`) needs, since staff should see their own store's price, not the base `MasterItem.rate`, when browsing.
- **New endpoint**: rate override management, e.g. `PUT /api/items/[id]/store-rate` — admin sets/clears their own store's override for that item; superadmin can target any store.

### 6.4 `src/app/api/quotations/route.ts`, `[id]/route.ts`, `[id]/finalize/route.ts`, `[id]/duplicate/route.ts`
- Every read (list, get-by-id) must filter `where: { storeId: <resolved store id> }`. List for admin/staff = own store only. List for superadmin = all stores by default, filterable to one via query param.
- Create: `storeId` set from `resolveStoreId()`, never from client input.
- Finalize: the quot-number generation inside this route must call the store-scoped sequence logic (4.5), and the resulting PDF (see 6.6) must pull the correct store's `CompanySettings` for the letterhead.
- Get-by-id / duplicate / any single-quotation route: must verify the quotation's `storeId` matches the requester's `storeId` (or requester is superadmin) before returning/acting — return 404 (not 403) for a quotation in a different store, to avoid confirming/denying existence of records the user shouldn't know about.

### 6.5 `src/app/api/categories/*`, `src/app/api/units/*`, `src/app/api/units/conversions/*`
Stay global per 4.7 — confirm no store filtering needed, but confirm write access is still admin/superadmin only (any store's admin can add a new shared category/unit — flag this to client as a deliberate choice: shared taxonomy means any store admin adding "Roofing Sheets" as a category makes it available to all stores immediately; if that's undesirable, categories/units would need to become superadmin-only to write, which is a one-line permission change, not a schema change — confirm preference).

### 6.6 `src/lib/pdf/generate.ts`
Must accept/derive the correct `storeId` from the quotation being rendered (`quotation.storeId`) and pull that store's `CompanySettings` row for every field currently hardcoded to the single global settings row (company name, address, phone, GSTIN, bank details). Read the current implementation first — confirm exactly how it currently fetches `CompanySettings` (likely a plain `findFirst()` or similar singleton read) before changing it to `findUnique({ where: { storeId } })`.

### 6.7 `src/app/api/settings/route.ts`
Currently manages the single global `CompanySettings` row. Becomes store-scoped: GET/PUT operate on the requester's own store's settings (admin) or a superadmin-specified store's settings (superadmin, store id via query param). No more implicit singleton.

## 7. Frontend Changes

- **New superadmin section** (e.g. `src/app/(authenticated)/superadmin/...`) mirroring the existing `admin/` route group: store list/create/edit, cross-store user management, cross-store quotation view. Reuse existing components (`users-table.tsx`, `user-form.tsx`, etc.) with a `storeId` prop/filter added rather than duplicating them — check whether these components currently assume a single implicit store context anywhere (e.g., no store column shown because there's only one store today) and add a store column/filter for superadmin's view.
- **Admin settings page** (`admin/settings/page.tsx`): currently edits the global singleton — becomes "edit my store's settings," same form, scoped write.
- **Item picker** (`item-picker.tsx`): must display the requesting store's effective rate (4.6's resolution), not raw `MasterItem.rate`, when staff/admin browse the catalog. Confirm current implementation's data source before changing it.
- **Login/session**: no visible UI change required, but confirm nothing in the frontend reads `session.user` assuming only `id`/`role`/`name` exist — anywhere the app currently does something like "there's only one store, don't bother showing which one" (e.g. quotation list, PDF preview) may need a "Store: X" label added, at least for superadmin's cross-store views so they can tell quotations apart.

## 8. Migration & Rollout

### 8.1 Data migration for the existing single store
The current live data (all of it) belongs to "SALINI TRADERS." The migration must:
1. Create one `Store` row for the existing business, using the current `CompanySettings` singleton's actual values (name, address, phone, GSTIN, bank details) — read the live `CompanySettings` row's current values before writing the migration script, don't just copy the schema defaults, in case they've since been edited via the settings UI.
2. Backfill `storeId` on every existing `User`, `Quotation`, and the existing `CompanySettings` row to point at that new store.
3. Backfill a `StoreQuotSequence` row for that store, seeded consistently with whatever the current global `QuotSequence`/quot-no state implies (i.e. new quotations for this store should continue the existing numbering, not restart at 1 — confirm this is desired; restarting at 1 for the original store would be surprising to existing customers comparing quote numbers over time).
4. Promote exactly one existing user to `superadmin` (confirm which — likely the account matching `mail2gauthamkrishna@gmail.com` per prior project convention, or whichever the client designates) so there's a way into the new superadmin screens after migration; everyone else keeps their existing role, now scoped to the one backfilled store.
5. This must be a single Prisma migration + backfill script (`prisma/migrations/.../migration.sql` plus a paired data-backfill script, following the existing pattern visible in `prisma/apply-migration.ts` / `prisma/apply-remote-migration.ts` / `prisma/backup-data.ts`) — read those existing scripts first, since there's already an established pattern in this repo for how schema changes get applied and data gets backed up before migrating; follow it rather than inventing a new mechanism. `backup.json` in the repo root suggests backups are already part of the workflow — confirm a fresh backup is taken immediately before running this migration.

### 8.2 New store URLs/routing
Confirm with client: do the 3-4 stores need distinct URLs (e.g. subdomains `pala.salini...`, or path-based `/store/pala/...`), or is a single URL with store-scoped login (each user's credentials imply their store) sufficient? The `slug` field on `Store` (4.1) supports either approach later, but recommend **starting with single-URL, store-implied-by-login** for v1 (matches "each user belongs to exactly one store" from your confirmed answer, and is far less infrastructure work than per-store subdomains/routing) unless the client has a specific reason to need distinct URLs per store (e.g. separate custom domains per store for their own branding).

## 9. Open Questions (flag to client before/during implementation)

1. **Store admin self-service of CompanySettings**: can a store's own `admin` edit their store's address/phone/GSTIN/bank details after initial setup, or is that superadmin-only (to prevent an admin accidentally/maliciously changing bank details)? Spec above (6.7) assumes self-service is allowed; flag if it should be superadmin-gated instead — this is a one-line permission check either way, not a design blocker.
2. **`User.username` global uniqueness**: currently `@unique` across the whole table. With multiple stores, is it acceptable for two different stores to both want a staff member named e.g. "admin" or "staff1"? Recommend keeping `username` globally unique for simplicity (matches how login works today — a bare username field with no store selector) unless the client wants per-store-scoped usernames (`@@unique([storeId, username])`), which would also require adding a store-selector to the login form. Flag before implementing.
3. **Existing store's quotation numbering continuity** (8.1.3): confirm continuing the current sequence vs. restarting at 1 now that it's "store 1 of many."
4. **Shared category/unit write access** (6.5): any store admin can add to the shared taxonomy today's design implies — confirm this is acceptable or should be superadmin-gated.
5. **Superadmin quotation authorship** (3.1): confirmed as superset-permission by default; flag if superadmin should be read-only/oversight instead.
6. **New-store onboarding flow** (6.1): single combined "create store + first admin" flow recommended — confirm vs. a two-step process.

## 10. Acceptance Criteria

1. Two different stores' staff, logged in separately, each create a quotation on the same day — both quotations can independently be numbered "1" (or whatever the continued sequence implies for the pre-existing store) without collision, and each PDF shows the correct store's own letterhead (name/address/GSTIN/bank details).
2. A staff member from Store A cannot view, edit, or fetch (via direct API call with a guessed/enumerated ID, not just via UI navigation) any quotation belonging to Store B — confirmed via a direct authenticated API request test, not just UI-level checking.
3. An admin from Store A can manage only Store A's users and cannot create, edit, or deactivate a user belonging to Store B, verified via direct API call.
4. Superadmin can log in, see a list of all stores, create a new store (with its own settings and first admin), and view quotations across all stores filtered by store.
5. A store admin sets a rate override for one catalog item; that store's staff see the overridden rate in the item picker and it's what gets snapshotted onto new quotation line items; a different store's staff still see the base `MasterItem.rate` (or their own store's separate override, if they've set one) for the same item.
6. The pre-existing "SALINI TRADERS" data is fully intact post-migration under its new `Store` row — no quotations, users, or catalog items lost or misattributed, verified by comparing row counts before/after migration.
7. Grep-based adversarial audit (per Section 0) of every query against store-owned models confirms no unscoped query paths remain, with results documented.
