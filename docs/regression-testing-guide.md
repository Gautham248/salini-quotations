# Multi-Tenant Quotation Generator — Regression Testing Guide

## Login Credentials

| Username | Password | Role | Store | Notes |
|----------|----------|------|-------|-------|
| `admin` | `admin123` | superadmin | (none) | Full access, all stores |
| `manager` | `manager123` | manager | (none) | Superadmin minus store create/delete |
| `staff` | `staff123` | staff | store 1 | Store 1 only, own quotations only |

## Automated Test Suite

```bash
pnpm vitest run          # 201 tests across 8 files
pnpm tsc --noEmit        # typecheck
```

Test files:
- `auth-guards.test.ts` — 31 tests: role guards, resolveStoreId for all roles
- `multi-tenant.test.ts` — 32 tests: store-scoping, user creation, cross-store guards, role promotion
- `routing.test.ts` — 16 tests: proxy middleware, page redirects, layout gates
- `quot-no.test.ts` — 3 tests: concurrent quotNo generation, store isolation, collision handling
- `calculations.test.ts` — 14 tests: rounding, GST, totals, amount-in-words
- `validation.test.ts` — 40 tests: Zod schemas for line items, cart, headers
- `api-utils.test.ts` — 25 tests: parseId, line item validation, quotNo assignment
- `use-quotation.test.ts` — 40 tests: hook-level add/edit/delete/quote-mode logic

## Manual Regression Checklist

### 1. Authentication & Routing
Run with `npm run dev` at `http://localhost:3000`.

- [ ] Login as `staff` → lands on `/quotations` (My Quotations)
- [ ] Login as `admin` → lands on `/admin` (Dashboard) with Master Items, Units, Users, All Quotations, Settings
- [ ] Login as `superadmin` (user: `admin`) → lands on `/superadmin` with Stores, All Users, All Quotations, Master Items, Units, Settings
- [ ] Login as `manager` → lands on `/superadmin` (same sidebar as superadmin)
- [ ] `staff` cannot navigate to `/admin` (redirects to `/quotations`)
- [ ] `admin` cannot navigate to `/superadmin` (redirects to `/quotations`)

### 2. Superadmin — Stores Module
- [ ] Navigate to Stores → see store list (store 1: SALINI TRADERS)
- [ ] Click "New Store" → create store with name, slug, company info, optional admin
- [ ] After creation: store appears in list, sidebar store selector updates
- [ ] Toggle store active/inactive
- [ ] Verify `manager` CANNOT create stores (POST /api/stores returns redirect/error)

### 3. Superadmin/Manager — Cross-Store Quotations
- [ ] Navigate to All Quotations → see filter by store dropdown
- [ ] Filter to a specific store → only that store's quotations shown
- [ ] Create a quotation → verify it belongs to the correct store
- [ ] View a quotation from store A vs store B
- [ ] Duplicate a quotation → verify duplicate gets fresh quotNo in correct store

### 4. Admin — Shared Catalog (Master Items)
- [ ] Login as the store admin (or superadmin clicking Master Items)
- [ ] Browse Master Items list → see all products with rates
- [ ] Add a new Master Item (description, unit, rate, GST)
- [ ] Edit an existing Master Item (change rate, description)
- [ ] Toggle item active/inactive
- [ ] Manage categories: add, rename, delete
- [ ] `staff` can browse the catalog (GET /api/items) but cannot create/edit/delete

### 5. Admin — Units & Conversions
- [ ] Navigate to Units → see unit list with conversion indicators
- [ ] Add a new unit
- [ ] Add a unit conversion (from → to + factor)
- [ ] Delete a conversion
- [ ] `staff` cannot access units management

### 6. Admin — Users Management
- [ ] Navigate to Users → see only users in own store
- [ ] Create a new staff user → verify storeId is forced to admin's store
- [ ] Create a new admin user → verify storeId is forced to admin's store
- [ ] Attempt to create a user with role "superadmin" as admin → defaults to "staff"
- [ ] Superadmin/manager: can create users in any store, can set any role
- [ ] Toggle user active/inactive
- [ ] Reset a user's password
- [ ] `staff` cannot access Users page

### 7. Admin — Company Settings
- [ ] Navigate to Settings → see company details form
- [ ] Edit company name, address, phone, mobile, email, GSTIN
- [ ] Edit bank details, disclaimer text, loading note
- [ ] Save → verify settings updated for correct store

### 8. Staff — Quotation Workflow
- [ ] Login as `staff` → lands on My Quotations
- [ ] Create a new quotation → auto-assigned to staff's store, fresh quotNo
- [ ] Add line items from catalog or custom items
- [ ] Edit existing line items (description, rate, qty)
- [ ] Delete line items
- [ ] Save quotation → verify it persists
- [ ] Duplicate a quotation → verify new quotNo and same store
- [ ] Finalize a quotation → PDF generated, status becomes "finalized"
- [ ] Staff can see only their own quotations, not other staff's in same store
- [ ] Admin can see ALL quotations in the store

### 9. Multi-Tenant Isolation
- [ ] Admin in store 1 cannot see quotations from store 2
- [ ] Admin in store 1 cannot see users from store 2 (404)
- [ ] Admin in store 1 cannot modify store 2's settings (returns 404 or empty)
- [ ] Staff in store 1 cannot browse anything from store 2
- [ ] Superadmin/manager can switch between stores and see all data

### 10. Concurrency — Quotation Numbers
- [ ] Open two browser tabs as staff, create new quotations simultaneously
- [ ] Verify both get unique sequential quotNos (no duplicates, no gaps)
- [ ] QuotNos are per-store: store 1 and store 2 each have their own independent sequences

### 11. Quotation Features (pre-existing)
- [ ] Line item weight mode: quotes by kg with auto-calculated item count
- [ ] Line item pieces mode: quotes by piece count
- [ ] Catalog item insertion with auto-populated fields
- [ ] GST auto-calculation on subtotals
- [ ] PDF preview and download
- [ ] Document locking: locked quotations cannot be edited by staff
- [ ] Search/filter quotations by customer or quotNo

### 12. Security Verification
- [ ] Direct API call to `GET /api/users` as staff → redirect to login or 403
- [ ] Direct API call to `PUT /api/quotations/999` for a quotation in another store → 404
- [ ] Direct API call to `POST /api/users` as admin with `storeId: 99` in body → storeId forced to admin's store
- [ ] Direct API call to `PATCH /api/users/999` for a user in another store → 404 (not 403)
- [ ] `resolveStoreId()` never reads `?storeId=` query param for admin/staff roles
