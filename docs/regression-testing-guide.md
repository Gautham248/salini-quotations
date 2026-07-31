# Multi-Tenant Quotation Generator — Regression Testing Guide

## Login Credentials

| Username | Password | Role | Store | Notes |
|----------|----------|------|-------|-------|
| `admin` | `admin123` | superadmin | (none) | Full access, all stores, can create/delete stores |
| `manager` | `manager123` | manager | (none) | Superadmin minus store create/delete and user deletion |
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

---

# 1. STAFF Workflows

Staff are store-scoped users who can only view and edit their own quotations within their assigned store.

## 1.1 Authentication & Landing
- [ ] Login as `staff` / `staff123` — lands on `/quotations` (My Quotations)
- [ ] Sidebar shows only: My Quotations, Master Items
- [ ] Sign out via sidebar → returns to login page
- [ ] Attempt to navigate to `/admin` → redirects to `/quotations`
- [ ] Attempt to navigate to `/superadmin` → redirects to `/quotations`
- [ ] Attempt to navigate to `/login` while authenticated → redirects to `/quotations`

## 1.2 My Quotations — List View
- [ ] See list of only own quotations (not other staff's in same store)
- [ ] Search by customer name or quotation number
- [ ] Filter by status (draft, finalized, locked)
- [ ] Filter by period (24h, 7d, 30d, all)
- [ ] Empty state shown when no quotations match filters
- [ ] Badge shows correct status per quotation (draft, finalized, locked)

## 1.3 New Quotation — Create
- [ ] Click "New Quotation" (or navigate to `/quotations/new`)
- [ ] Fill customer name, address, place, GSTIN
- [ ] Set delivery terms, GST note, validity, payment terms
- [ ] Add line items:
  - [ ] Add item from catalog (auto-populates description, unit, rate, GST)
  - [ ] Add custom line item (manual description, unit, rate, GST, qty)
  - [ ] Use quantity mode: enter qty → auto-calculates net value
  - [ ] Use weight mode: enter rate and weight in kg → calculates qty and net value
  - [ ] Use pieces mode: enter rate and piece count → calculates net value
  - [ ] Edit existing line items inline (description, rate, qty)
  - [ ] Delete a line item
  - [ ] Reorder line items
- [ ] Save — quotation appears in list with status "draft"
- [ ] Quotation auto-assigned to staff's store, gets a fresh sequential quotNo

## 1.4 View Quotation
- [ ] Click on a quotation → view page shows all header fields, line items, totals
- [ ] Toggle between Full Preview and Scaled Preview
- [ ] **Generate PDF** → PDF downloads with company branding, header, line items, GST breakdown, amount in words
- [ ] PDF includes: company name, address, phone, email, GSTIN from store settings
- [ ] PDF includes: disclaimer text, loading note
- [ ] PDF includes: subtotal, CGST, SGST, round-off, net amount, amount in words
- [ ] **Duplicate** → creates new draft with same content, fresh quotNo, same store
- [ ] **Edit** → opens edit form (see 1.5)
- [ ] **Delete** → confirmation dialog, quotation removed from list

## 1.5 Edit Quotation
- [ ] Edit header fields (customer name, address, place, GSTIN, delivery terms, validity, payment terms)
- [ ] Edit line items (add, modify, delete, reorder)
- [ ] Save → changes persist, updated at timestamp refreshes
- [ ] **Finalize** a quotation → status changes to "finalized", PDF generated
- [ ] **Cannot edit a finalized quotation** — error message shown
- [ ] **Cannot edit a locked quotation** — error message shown
- [ ] Staff can only edit OWN quotations (not other staff's)

## 1.6 Master Items — Browse Only
- [ ] Navigate to Master Items → see all active items with effective rates
- [ ] Search items by description (space-separated tokens for multi-word search)
- [ ] Filter by category
- [ ] See item details: description, primary unit, alternate units, rate, GST%
- [ ] **Cannot** create, edit, or toggle items (no add/edit/toggle buttons visible)
- [ ] Category filter dropdown works correctly

## 1.7 Analytics / Dashboard
- [ ] Staff does NOT have a Dashboard link in sidebar
- [ ] (No analytics page accessible for staff)

---

# 2. ADMIN Workflows

Admins are store-scoped managers who can manage their store's items, units, users, settings, and all quotations in their store.

## 2.1 Authentication & Landing
- [ ] Login as a store admin → lands on `/admin` (Dashboard)
- [ ] Sidebar shows: Dashboard, Master Items, Units, Users, All Quotations, Settings
- [ ] Attempt to navigate to `/superadmin` → redirects to `/quotations`

## 2.2 Dashboard / Analytics
- [ ] See analytics scoped to admin's store:
  - [ ] Period selector: 24h, 7d, 30d
  - [ ] Quotation counts and values for selected period
  - [ ] Status breakdown (draft, finalized, locked, archived)
  - [ ] All-time quotation count and total value
  - [ ] Master items count (active / total)
  - [ ] Units count
  - [ ] Recent quotations list

## 2.3 Master Items — Full CRUD
- [ ] Browse Master Items list (same as staff view but with edit controls)
- [ ] **Create** new item:
  - [ ] Description, unit selection (from active units), base rate, GST%
  - [ ] Optional: weight per unit, pieces per unit
  - [ ] Optional: assign to categories
  - [ ] Optional: add alternate units with conversion factors
- [ ] **Edit** existing item:
  - [ ] Change description, unit, rate, GST%
  - [ ] Update categories
  - [ ] Add/remove alternate units
- [ ] **Toggle** active/inactive — switches to opposite state
- [ ] **Category management**:
  - [ ] Create new category
  - [ ] Rename existing category
  - [ ] Delete unused category
- [ ] Audit trail: createdBy / updatedBy fields populated

## 2.4 Units & Conversions
- [ ] Navigate to Units → see list of active units with conversion indicators
- [ ] **Create** new unit → appears in list
- [ ] **Add conversion**: from unit → to unit with conversion factor
- [ ] **Delete** conversion
- [ ] Unit conversion lookup available via API
- [ ] Cannot create duplicate unit names (shows error)

## 2.5 Users Management
- [ ] See list of users in own store only
- [ ] **Create** new user:
  - [ ] Username, password
  - [ ] Role selection: only staff or admin (not superadmin)
  - [ ] StoreID forced to admin's own store
  - [ ] new user gets `forcePasswordChange: true`
- [ ] **Toggle** user active/inactive
- [ ] **Reset password** for any user in store
- [ ] **Update role** for users in store (staff ↔ admin)
- [ ] **Delete** user in own store:
  - [ ] Cannot delete own account
  - [ ] Foreign key references reassigned to calling admin
  - [ ] Warning if deleting last manager in store
- [ ] Cannot modify users in other stores (gets 404)
- [ ] Cannot assign superadmin role

## 2.6 All Quotations (Store-Scoped)
- [ ] Navigate to All Quotations → see ALL quotations in the store
- [ ] Search, filter by status, filter by period (same as staff)
- [ ] View, edit, duplicate, delete any quotation in the store
- [ ] Can edit finalized quotations (staff cannot)
- [ ] Can lock/unlock quotations (staff cannot edit locked ones)

## 2.7 Company Settings
- [ ] Navigate to Settings → see company details form (pre-filled for store)
- [ ] Edit: company name, subheading, phone, mobile, email, GSTIN
- [ ] Edit: bank details, disclaimer text, loading note
- [ ] Save → settings persisted for correct store
- [ ] Changes reflected in PDF output immediately

---

# 3. MANAGER Workflows

Manager inherits all ADMIN permissions plus cross-store visibility. Cannot create/delete stores or delete users.

## 3.1 Authentication & Landing
- [ ] Login as `manager` / `manager123`
- [ ] Root page redirects to `/quotations` (My Quotations)
- [ ] Sidebar shows admin links (same as admin): Dashboard, Master Items, Units, Users, All Quotations, Settings
- [ ] Manager CAN navigate to `/superadmin` routes

## 3.2 Cross-Store Capabilities
- [ ] All Quotations: see quotations across all stores with store filter dropdown
- [ ] Users: see users across all stores with store filter
- [ ] Dashboard shows cross-store analytics
- [ ] Settings: can access and modify any store's settings via storeId query param
- [ ] Store rates: can set per-store item rate overrides for any store

## 3.3 Store Management (Read/Edit Only)
- [ ] Access `/superadmin/stores` → see store list
- [ ] **Can edit** store name and slug
- [ ] **Can toggle** store active/inactive (also toggles all non-superadmin users in that store)
- [ ] **Cannot create** new stores (API returns 403)
- [ ] **Cannot delete** stores (API returns 403)

## 3.4 User Management
- [ ] Can create users for any store, any role
- [ ] Can toggle, reset password, update role for users in any store
- [ ] **Cannot delete** any user (returns 403 — only admin/superadmin can)

## 3.5 All Admin Capabilities
- [ ] All workflows from Section 2 (ADMIN) apply to manager across any store

---

# 4. SUPERADMIN Workflows

Superadmin has unrestricted access: all stores, all users, all data, store creation/deletion.

## 4.1 Authentication & Landing
- [ ] Login as `admin` / `admin123` → lands on `/superadmin` (Super Admin Dashboard)
- [ ] Sidebar shows: Dashboard, Stores, All Users, All Quotations, New Quotation, Master Items, Units, Settings

## 4.2 Super Admin Dashboard / Analytics
- [ ] Cross-store analytics: total stores (active/inactive), total quotations, total value
- [ ] Per-store breakdown with quot counts and values
- [ ] Period selector works across all stores
- [ ] Status breakdown and recent quotations list

## 4.3 Stores — Full CRUD
- [ ] Navigate to Stores → see all stores with status, user count, quot count
- [ ] **Create** new store:
  - [ ] Name, slug
  - [ ] Company name, subheading, phone, mobile, email, GSTIN
  - [ ] Optional: create first admin user (username + password)
  - [ ] Verifies: CompanySettings and StoreQuotSequence created automatically
- [ ] **Edit** store name and slug
- [ ] **Toggle** store active/inactive (also toggles all non-superadmin users in store)
- [ ] **Delete** store:
  - [ ] Option: delete staff or unassign
  - [ ] Option: delete quotations or archive
  - [ ] Verifies: all store auxiliary records cleaned up (rates, settings, quot sequence)

## 4.4 All Users — Cross-Store
- [ ] See all users across all stores with store filter
- [ ] Create users for any store, any role (including superadmin)
- [ ] Toggle, reset password, update role, delete any user (except self)
- [ ] Cannot modify or delete own account

## 4.5 All Quotations — Cross-Store
- [ ] See all quotations across all stores with store filter
- [ ] View, edit, duplicate, delete any quotation in any store
- [ ] Finalize any quotation → PDF generated with correct store branding

## 4.6 Store-Rate Overrides
- [ ] On Master Items page, set per-store rate override for an item
- [ ] Remove per-store rate override
- [ ] Verifies: override rate takes priority over base rate when viewing items from that store

## 4.7 Shared Resources (Same as Admin)
- [ ] Master Items: full CRUD (shared across all stores)
- [ ] Units: create/manage/conversions (shared)
- [ ] Categories: create/rename/delete (shared)
- [ ] Settings: can access any store's settings via storeId param

---

# 5. MULTI-TENANT ISOLATION

## 5.1 Data Isolation
- [ ] Admin in store 1 cannot see quotations from store 2
- [ ] Admin in store 1 cannot see users from store 2 (returns 404)
- [ ] Admin in store 1 cannot modify store 2's settings (returns 404)
- [ ] Staff in store 1 sees only their own quotations within store 1
- [ ] Staff in store 1 cannot access store 2 data via any route or API
- [ ] Manager/superadmin can switch between stores and see all data

## 5.2 Store-Scoping Verification
- [ ] `resolveStoreId()` never reads `?storeId=` query param for admin/staff roles
- [ ] `resolveStoreId()` reads `?storeId=` query param only for superadmin
- [ ] All quotation operations verify store ownership before CRUD
- [ ] All user operations verify store ownership before modification

## 5.3 API Security
- [ ] Direct API call to `GET /api/users` as staff → redirect/403
- [ ] Direct API call to `PUT /api/quotations/999` for another store's quotation → 404
- [ ] Direct API call to `POST /api/users` as admin with `storeId: 99` in body → storeId forced to admin's store
- [ ] Direct API call to `PATCH /api/users/999` for user in another store → 404
- [ ] Direct API call to `DELETE /api/stores/1` as manager → 403
- [ ] Direct API call to `POST /api/stores` as manager → 403
- [ ] Direct API call to `DELETE /api/users/1` as manager → 403
- [ ] Unauthenticated access to any API → 401/redirect to login

---

# 6. QUOTATION ENGINE FEATURES

## 6.1 Quotation Numbering
- [ ] Sequential quotNo per store (store 1 and store 2 have independent sequences)
- [ ] Open two browser tabs as staff, create simultaneous quotations → unique sequential quotNos
- [ ] No gaps or duplicates in quotNos

## 6.2 Line Item Modes
- [ ] **Quantity mode**: enter rate × qty → auto net value
- [ ] **Weight mode**: enter rate × weight in kg → auto qty and net value
- [ ] **Pieces mode**: enter rate × piece count → auto net value
- [ ] Switch between modes on existing line items

## 6.3 Calculations
- [ ] Subtotal = sum of all line item net values
- [ ] CGST = subtotal × (GST% / 2) for each item, summed
- [ ] SGST = subtotal × (GST% / 2) for each item, summed
- [ ] Round-off = rounded to nearest integer
- [ ] Net amount = rounded(subtotal + CGST + SGST) with round-off
- [ ] Amount in words: "Rupees X and Y Paise Only"

## 6.4 PDF Generation
- [ ] PDF renders with correct store branding (company name, address, phone, email, GSTIN)
- [ ] PDF includes all header fields, line items table, totals, amount in words
- [ ] PDF includes disclaimer text and loading note
- [ ] PDF can be viewed inline (Content-Disposition: inline)
- [ ] PDF regenerates on each finalize/view request

## 6.5 Quotation Lifecycle
- [ ] Draft → editable by creator and admins
- [ ] Finalized → editable only by admins, not staff
- [ ] Locked → not editable by staff even if draft
- [ ] Duplicate → creates new draft with fresh quotNo
- [ ] Delete → removes quotation and all line items

---

# 7. UI / UX VERIFICATION

## 7.1 Navigation
- [ ] Desktop: sidebar with collapsible mode (collapse/expand)
- [ ] Mobile: bottom navigation bar with "More" sheet
- [ ] All sidebar links prefetch on hover
- [ ] Active link highlighted with accent color
- [ ] Navigation progress bar appears on route changes

## 7.2 Responsive Design
- [ ] Tables scroll horizontally on mobile
- [ ] Forms stack vertically on mobile
- [ ] Sidebar adapts to mobile bottom bar
- [ ] Bottom padding on main content to avoid nav bar overlap

## 7.3 Error Handling
- [ ] Form validation errors shown inline
- [ ] API errors shown as toast notifications
- [ ] 404 pages shown for nonexistent routes
- [ ] Loading spinners shown during data fetches

## 7.4 Confirmation Dialogs
- [ ] Sign out: confirmation dialog (Cancel / Sign Out)
- [ ] Delete quotation: confirmation dialog
- [ ] Delete user: confirmation dialog
- [ ] Delete store: confirmation dialog
- [ ] No browser-native alert/confirm anywhere

## 7.5 PWA
- [ ] Service worker registered
- [ ] Manifest with correct icons
- [ ] Installable on supported browsers

---

# 8. CONCURRENCY

- [ ] Simultaneous quotation creation from two tabs → unique quotNos
- [ ] Simultaneous updates to same quotation → last write wins without corruption
- [ ] Store deletion with concurrent user login → handled gracefully
- [ ] Store toggle active/inactive → all store users immediately reflected

---

# 9. EDGE CASES & STRESS TESTING

- [ ] Quotation with 25+ line items → renders correctly in both preview and PDF
- [ ] Long customer name (60+ chars) → displayed without overflow
- [ ] Multi-line customer address → renders correctly in PDF
- [ ] Empty optional fields (GSTIN, address, delivery terms) → handled gracefully
- [ ] Zero-rate items → calculate correctly
- [ ] Zero-quantity items → validate and reject or handle
- [ ] Very large quantities/rates → no overflow in calculations
- [ ] Quotation with no line items → cannot be finalized (requires 1+ items)
- [ ] Store with no quotations → empty state shown
- [ ] Category with no items → deletable
- [ ] Category with items → deletable (items become uncategorized)
- [ ] User deleted who created items/quotations → FK references reassigned
- [ ] Inactive store → users cannot log in (authentication fails)
- [ ] Inactive user → cannot log in
