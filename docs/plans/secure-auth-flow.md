# Secure Authentication Flow

## Current Security Posture (Vulnerabilities Found)

1. **No middleware route protection** — `(authenticated)/layout.tsx` has zero auth checks. The layout is just a wrapper — there's no server-side guard preventing unauthenticated page access. `requireAuth()` uses `redirect()` which only works in server components, but the layout imports a client component (Sidebar), making the entire tree client-side.

2. **No rate limiting on login** — `/api/auth/callback/credentials` has unlimited brute-force surface. No cooldown, no attempt tracking, no account lockout.

3. **`forcePasswordChange` never enforced** — The field is set to `true` on user creation and password reset, but nothing checks it or redirects users to change their password.

4. **Hardcoded default passwords** — `prisma/seed.ts` creates admin/staff with `admin123`/`staff123` in plain text.

5. **No password policy** — User creation accepts any password, no minimum length or complexity requirements.

6. **`AUTH_SECRET` committed to repo** — Lives in `.env` (tracked) instead of `.env.local` (gitignored).

7. **No session invalidation on deactivation** — If an admin deactivates a user, their existing JWT remains valid until it expires (no `maxAge` configured, so essentially forever).

8. **No audit trail** — No logging of login attempts, failures, password changes, or role modifications.

9. **No input validation on credentials** — The authorize function doesn't validate username/password format or length before querying the database.

---

## Plan

### 1. Add `middleware.ts` for Route-Level Protection

**File:** `src/middleware.ts` (new)

Use NextAuth's `auth` middleware to protect all routes under `/(authenticated)` and `/admin`. Unauthenticated users redirect to `/login`. Also redirect users with `forcePasswordChange` to a password-change page.

```ts
// Pseudocode for middleware:
// - Matcher: /quotations/**, /admin/**
// - Call auth()
// - If no session → redirect to /login?callbackUrl=...
// - If session.user.forcePasswordChange → redirect to /change-password
// - If /admin/** and role !== "admin" → redirect to /quotations
```

### 2. Add Rate Limiting to Login

**File:** `src/lib/rate-limit.ts` (new)

Implement an in-memory rate limiter that tracks login attempts per IP/username. After 5 failed attempts, lock out for 15 minutes. Integrate into the `authorize` function in `auth.ts`.

Approach:
- Use a `Map<string, { count: number; firstAttempt: number; lockedUntil: number }>` stored module-scoped (in-memory, serverless-safe for single-instance).
- Before bcrypt.compare, check if the username is rate-limited. If so, return null immediately.
- On failed auth, increment counter. On success, reset counter.
- Clean up stale entries periodically.

### 3. Enforce Password Policies

**Files:** `src/app/api/users/route.ts`, `src/lib/validation.ts`

Add password validation rules:
- Minimum 8 characters
- At least one letter and one digit
- Reject the username itself being part of the password

Reuse the existing `src/lib/validation.ts` zod patterns.

### 4. Enforce `forcePasswordChange`

**Files:** `src/middleware.ts`, `src/app/(authenticated)/change-password/page.tsx` (new), `src/app/api/auth/change-password/route.ts` (new)

- Middleware checks `session.user.forcePasswordChange` and redirects to `/change-password` for any non-GET/non-API request.
- New change-password page with old password + new password fields.
- New API route that validates old password, enforces password policy on new password, updates hash and sets `forcePasswordChange = false`.
- After successful change, redirect to original destination.

### 5. Move `AUTH_SECRET` Out of Tracked Files

**Files:** `.env`, `.env.local` (new), `.gitignore`

- Remove `AUTH_SECRET` from `.env`.
- Create `.env.local` with `AUTH_SECRET` (auto-generated during dev setup).
- Add `.env.local` to `.gitignore`.
- Run `openssl rand -base64 32` to generate a fresh secret.

### 6. Session Invalidation on User Deactivation

**File:** `src/middleware.ts`

Extend the middleware to check if the user is still active on every authenticated request. Since JWT is stateless, query the database for `isActive` status on each protected request (or use a short maxAge like 15 minutes to limit stale session window). For a pragmatic approach: set `session.maxAge = 900` (15 min) in auth config so deactivated users lose access within 15 minutes.

### 7. Add Audit Logging

**File:** `src/lib/audit.ts` (new)

Simple console-based logging as a starting point (structured JSON with timestamp, event type, username, IP). Events to log:
- Login success
- Login failure (with username and IP)
- Password change
- User creation
- User deactivation/reactivation
- Role change

### 8. Secure the Authorize Function

**File:** `src/lib/auth.ts`

- Validate username format (alphanumeric, 3-50 chars) before querying DB.
- Validate password length (at least 1 char, protect against empty password bypass).
- Add generic error message to prevent username enumeration (`"Invalid username or password"` instead of separate messages).
- Use `timingSafeEqual` for password comparison timing (mitigate timing attacks). Note: `bcrypt.compare` already handles this.

### 9. Add CSRF Middleware Verification

**File:** `src/middleware.ts`

NextAuth v5 uses double-submit cookie CSRF by default. The middleware should verify:
- All mutation methods (POST/PUT/PATCH/DELETE) for non-auth API routes check the CSRF token.
- NextAuth's built-in CSRF protection covers the credentials provider, but custom API routes should also verify.

### 10. Remove Hardcoded Credentials from Seed

**File:** `prisma/seed.ts`

- Read default passwords from environment variables: `SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD`.
- Fall back to a randomly generated password (log it) if env vars are missing.
- Force password change on first login (already does this via `forcePasswordChange: true`).

---

## Implementation Order

| Step | Files | Scope |
|------|-------|-------|
| 1 | `src/middleware.ts` | Route protection, force-password-change redirect |
| 2 | `src/lib/rate-limit.ts`, `src/lib/auth.ts` | Login brute-force protection |
| 3 | `src/lib/validation.ts`, `src/app/api/users/route.ts` | Password policy enforcement |
| 4 | `src/app/(authenticated)/change-password/`, `src/app/api/auth/change-password/` | Password change flow |
| 5 | `.env`, `.env.local`, `.gitignore` | Secret management |
| 6 | `src/lib/auth.ts` | session maxAge config |
| 7 | `src/lib/audit.ts`, `src/lib/auth.ts`, `src/app/api/users/` | Audit logging |
| 8 | `prisma/seed.ts` | Remove hardcoded passwords |
| 9 | `src/lib/rbac.ts` | Centralize role constants |

---

## Verification

1. **Test middleware:** Access `/quotations` without session → redirected to `/login`. Access with valid session → page loads.
2. **Test rate limiting:** Submit 5 failed logins → 6th attempt returns generic error. Wait 15 min → can log in again.
3. **Test password policy:** Try creating user with `"123"` → rejected. Use `"TestPass1"` → accepted.
4. **Test force password change:** Create new user → redirected to `/change-password` on first login → change succeeds → directed to original destination.
5. **Test session timeout:** Log in, wait 15 min, refresh → redirected to `/login`.
6. **Test deactivation:** Admin deactivates user, user refreshes within 15 min → access denied.
7. **Test audit:** Check console output for structured log entries on login/logout/user changes.
8. **Run full test suite:** `pnpm test` — all 119 existing tests must still pass.
