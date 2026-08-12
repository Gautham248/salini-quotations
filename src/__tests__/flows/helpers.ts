/**
 * Flow test helpers — HTTP-level login and request utilities.
 *
 * The Next-Auth credentials flow:
 *   1. GET /api/auth/csrf  →  get csrfToken
 *   2. POST /api/auth/callback/credentials  →  set-cookie + JSON response
 *   3. Re-use the authjs.session-token cookie for subsequent requests
 */

const BASE = process.env.FLOW_TEST_BASE_URL || "http://localhost:3456";

// ── Cookie jar ───────────────────────────────────────────────────────────────

let _cookies: Partial<Record<string, string>> = {};

function clearCookies() {
  _cookies = {};
}

function parseSetCookie(setCookie: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const header of setCookie.split(/,(?=[^;]+\s*=)/)) {
    const [nameVal] = header.trim().split(";");
    const eq = nameVal.indexOf("=");
    if (eq > 0) {
      parsed[nameVal.slice(0, eq).trim()] = nameVal.slice(eq + 1).trim();
    }
  }
  return parsed;
}

function cookieHeader(): string {
  return Object.entries(_cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ── CSRF ─────────────────────────────────────────────────────────────────────

async function fetchCsrf(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/csrf`, {
    headers: process.env.FLOW_TEST_ORIGIN
      ? { origin: process.env.FLOW_TEST_ORIGIN }
      : {},
  });
  // Capture CSRF cookie
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    Object.assign(_cookies, parseSetCookie(setCookie));
  }
  const body = (await res.json()) as { csrfToken: string };
  if (!body.csrfToken) throw new Error("Failed to get CSRF token");
  return body.csrfToken;
}

// ── Login ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  ok: boolean;
  userId?: number;
  role?: string;
  storeId?: number | null;
  error?: string;
}

export async function loginAs(
  username: string,
  password: string,
): Promise<LoginResult> {
  clearCookies();

  const csrfToken = await fetchCsrf();

  const formBody = new URLSearchParams({
    csrfToken,
    username,
    password,
    redirect: "false",
    json: "true",
  });

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
      ...(process.env.FLOW_TEST_ORIGIN
        ? { origin: process.env.FLOW_TEST_ORIGIN }
        : {}),
    },
    body: formBody.toString(),
    redirect: "manual",
  });

  // Capture cookies
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    Object.assign(_cookies, parseSetCookie(setCookie));
  }

  // Verify by fetching the session endpoint
  const sess = await getSession();
  if (sess) {
    return {
      ok: true,
      userId: sess.user.id,
      role: sess.user.role,
      storeId: sess.user.storeId,
    };
  }

  return { ok: false, error: "Login failed" };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const csrfToken = _cookies["authjs.csrf-token"] || (await fetchCsrf());

  const formBody = new URLSearchParams({ csrfToken, json: "true" });

  const res = await fetch(`${BASE}/api/auth/signout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
      ...(process.env.FLOW_TEST_ORIGIN
        ? { origin: process.env.FLOW_TEST_ORIGIN }
        : {}),
    },
    body: formBody.toString(),
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    Object.assign(_cookies, parseSetCookie(setCookie));
  }

  clearCookies();
}

// ── Session ───────────────────────────────────────────────────────────────────

interface SessionData {
  user: {
    id: number;
    role: string;
    storeId: number | null;
    name?: string;
  };
}

export async function getSession(): Promise<SessionData | null> {
  const cookie = cookieHeader();
  const res = await fetch(`${BASE}/api/auth/session`, {
    headers: {
      Cookie: cookie,
      ...(process.env.FLOW_TEST_ORIGIN
        ? { origin: process.env.FLOW_TEST_ORIGIN }
        : {}),
    },
  });

  if (!res.ok) return null;

  const body = await res.json();
  // NextAuth session endpoint returns {} if not authenticated
  if (!body || !body.user || !body.user.id) return null;

  return body as SessionData;
}

// ── HTTP request helpers ─────────────────────────────────────────────────────

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  ok: boolean;
}

export async function apiRequest<T = unknown>(
  method: Method,
  path: string,
  options?: {
    body?: Record<string, unknown>;
    searchParams?: Record<string, string>;
  },
): Promise<ApiResponse<T>> {
  const url = new URL(path, BASE);
  if (options?.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    Cookie: cookieHeader(),
    ...(process.env.FLOW_TEST_ORIGIN
      ? { origin: process.env.FLOW_TEST_ORIGIN }
      : {}),
  };

  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual",
  });

  // Capture any new cookies
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    Object.assign(_cookies, parseSetCookie(setCookie));
  }

  const contentType = res.headers.get("content-type") || "";
  let body: T;
  if (contentType.includes("application/json")) {
    body = (await res.json()) as T;
  } else {
    body = (await res.text()) as unknown as T;
  }

  return { status: res.status, headers: res.headers, body, ok: res.ok };
}

// Shorthand methods
export const api = {
  get: <T = unknown>(path: string, params?: Record<string, string>) =>
    apiRequest<T>("GET", path, { searchParams: params }),
  post: <T = unknown>(path: string, body?: Record<string, unknown>) =>
    apiRequest<T>("POST", path, { body }),
  put: <T = unknown>(path: string, body?: Record<string, unknown>) =>
    apiRequest<T>("PUT", path, { body }),
  patch: <T = unknown>(path: string, body?: Record<string, unknown>) =>
    apiRequest<T>("PATCH", path, { body }),
  del: <T = unknown>(path: string) =>
    apiRequest<T>("DELETE", path),
};
