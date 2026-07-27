import { auth } from "./auth";
import { redirect } from "next/navigation";

type SessionWithUser = {
  user: {
    id: number;
    role: string;
    storeId: number | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function session(s: unknown): SessionWithUser | null {
  const sess = s as SessionWithUser | null;
  if (sess?.user?.id) return sess;
  return null;
}

export async function getSession() {
  return session(await auth());
}

export async function requireAuth(): Promise<SessionWithUser> {
  const s = session(await auth());
  if (!s?.user) redirect("/login");
  return s;
}

// Accepts "admin", "superadmin", and "manager" — manager is a strict superset of admin
export async function requireAdmin(): Promise<SessionWithUser> {
  const s = await requireAuth();
  const adminRoles = new Set(["admin", "superadmin", "manager"]);
  if (!adminRoles.has(s.user.role)) redirect("/quotations");
  return s;
}

export async function requireSuperAdmin(): Promise<SessionWithUser> {
  const s = await requireAuth();
  if (s.user.role !== "superadmin") redirect("/quotations");
  return s;
}

// "manager" or "superadmin" — cross-store privilege without store creation/deletion
export async function requireManager(): Promise<SessionWithUser> {
  const s = await requireAuth();
  const roles = new Set(["superadmin", "manager"]);
  if (!roles.has(s.user.role)) redirect("/quotations");
  return s;
}

/**
 * Single choke point for store-scoping decisions.
 * - admin/staff: always returns their own storeId from the session (NEVER from request input).
 * - superadmin/manager: reads storeId from request query param `?storeId=` or as a fallback from the session.
 * - Returns null only for genuinely cross-store operations (e.g. listing all stores).
 */
export async function resolveStoreId(request?: Request): Promise<number | null> {
  const s = await requireAuth();

  if (s.user.role === "admin" || s.user.role === "staff") {
    return s.user.storeId ?? null;
  }

  if (s.user.role === "superadmin" || s.user.role === "manager") {
    if (request) {
      const { searchParams } = new URL(request.url);
      const param = searchParams.get("storeId");
      if (param) {
        const n = parseInt(param);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return s.user.storeId ?? null;
  }

  return null;
}
