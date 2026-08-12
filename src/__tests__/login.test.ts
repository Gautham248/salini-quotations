import { describe, it, expect, vi, beforeEach } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/lib/auth.ts — authorize callback logic
// ──────────────────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  storeId: number | null;
  isActive: boolean;
  store?: { isActive: boolean } | null;
}

async function authorize(
  credentials: { username?: string; password?: string } | undefined,
  findUser: (username: string) => Promise<MockUser | null>,
  comparePassword: (plain: string, hash: string) => Promise<boolean>,
): Promise<{ id: string; name: string; role: string; storeId: number | null } | null> {
  if (!credentials?.username || !credentials?.password) return null;

  const user = await findUser(credentials.username as string);
  if (!user || !user.isActive) return null;

  if (user.role !== "superadmin" && (!user.storeId || !user.store || !user.store.isActive)) {
    return null;
  }

  const valid = await comparePassword(credentials.password as string, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, name: user.username, role: user.role, storeId: user.storeId };
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/lib/auth.ts — JWT & session callbacks
// ──────────────────────────────────────────────────────────────────────────────

interface Token {
  id?: number;
  role?: string;
  storeId?: number | null;
}

function jwtCallback(params: { token: Token; user?: { id: string; role: string; storeId: number | null } }): Token {
  if (params.user) {
    return { id: Number(params.user.id), role: params.user.role, storeId: params.user.storeId };
  }
  return params.token;
}

function sessionCallback(params: { session: { user?: Record<string, unknown> }; token: Token }): { user: Record<string, unknown> } {
  return {
    user: {
      ...(params.session.user || {}),
      id: params.token.id,
      role: params.token.role,
      storeId: params.token.storeId,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "1",
    username: "admin",
    passwordHash: "$2a$12$hashed",
    role: "admin",
    storeId: 5,
    isActive: true,
    store: { isActive: true },
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests: authorize
// ──────────────────────────────────────────────────────────────────────────────

describe("authorize callback", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let findUser: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let comparePassword: any;

  beforeEach(() => {
    findUser = vi.fn();
    comparePassword = vi.fn();
  });

  it("returns user on valid credentials", async () => {
    findUser.mockResolvedValue(makeUser());
    comparePassword.mockResolvedValue(true);

    const result = await authorize({ username: "admin", password: "admin123" }, findUser, comparePassword);
    expect(result).toEqual({ id: "1", name: "admin", role: "admin", storeId: 5 });
  });

  it("returns null when user not found", async () => {
    findUser.mockResolvedValue(null);
    const result = await authorize({ username: "unknown", password: "pass" }, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("returns null when password is wrong", async () => {
    findUser.mockResolvedValue(makeUser());
    comparePassword.mockResolvedValue(false);
    const result = await authorize({ username: "admin", password: "wrong" }, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("returns null when user is inactive", async () => {
    findUser.mockResolvedValue(makeUser({ isActive: false }));
    comparePassword.mockResolvedValue(true);
    const result = await authorize({ username: "admin", password: "admin123" }, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("returns null when admin user store is inactive", async () => {
    findUser.mockResolvedValue(makeUser({ store: { isActive: false } }));
    comparePassword.mockResolvedValue(true);
    const result = await authorize({ username: "admin", password: "admin123" }, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("returns null when admin user has null storeId", async () => {
    findUser.mockResolvedValue(makeUser({ storeId: null, store: null }));
    comparePassword.mockResolvedValue(true);
    const result = await authorize({ username: "admin", password: "admin123" }, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("allows superadmin even when storeId is null", async () => {
    findUser.mockResolvedValue(makeUser({ role: "superadmin", storeId: null, store: null }));
    comparePassword.mockResolvedValue(true);
    const result = await authorize({ username: "superadmin", password: "admin123" }, findUser, comparePassword);
    expect(result).not.toBeNull();
    expect(result!.role).toBe("superadmin");
    expect(result!.storeId).toBeNull();
  });

  it("returns null when credentials are missing", async () => {
    const result = await authorize(undefined, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("returns null when username is empty", async () => {
    const result = await authorize({ username: "", password: "pass" }, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("returns null when password is empty", async () => {
    const result = await authorize({ username: "admin", password: "" }, findUser, comparePassword);
    expect(result).toBeNull();
  });

  it("passes correct username to findUser", async () => {
    findUser.mockResolvedValue(makeUser());
    comparePassword.mockResolvedValue(true);
    await authorize({ username: "admin", password: "admin123" }, findUser, comparePassword);
    expect(findUser).toHaveBeenCalledWith("admin");
  });

  it("passes correct password to comparePassword", async () => {
    findUser.mockResolvedValue(makeUser());
    comparePassword.mockResolvedValue(true);
    await authorize({ username: "admin", password: "admin123" }, findUser, comparePassword);
    expect(comparePassword).toHaveBeenCalledWith("admin123", "$2a$12$hashed");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: JWT callback
// ──────────────────────────────────────────────────────────────────────────────

describe("JWT callback", () => {
  it("populates token from user on first call", () => {
    const token = jwtCallback({
      token: {},
      user: { id: "5", role: "admin", storeId: 10 },
    });
    expect(token).toEqual({ id: 5, role: "admin", storeId: 10 });
  });

  it("returns existing token when no user (subsequent calls)", () => {
    const existing = { id: 5, role: "admin", storeId: 10 };
    const token = jwtCallback({ token: existing });
    expect(token).toBe(existing);
  });

  it("overwrites existing token on fresh login with user", () => {
    const token = jwtCallback({
      token: { id: 1, role: "staff", storeId: 3 },
      user: { id: "7", role: "superadmin", storeId: null },
    });
    expect(token).toEqual({ id: 7, role: "superadmin", storeId: null });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: session callback
// ──────────────────────────────────────────────────────────────────────────────

describe("session callback", () => {
  it("adds id, role, storeId to session user", () => {
    const result = sessionCallback({
      session: { user: { name: "Test User" } },
      token: { id: 5, role: "admin", storeId: 10 },
    });
    expect(result.user.id).toBe(5);
    expect(result.user.role).toBe("admin");
    expect(result.user.storeId).toBe(10);
  });

  it("handles empty session user", () => {
    const result = sessionCallback({
      session: {},
      token: { id: 3, role: "staff", storeId: 7 },
    });
    expect(result.user).toEqual({
      id: 3,
      role: "staff",
      storeId: 7,
    });
  });

  it("handles null storeId", () => {
    const result = sessionCallback({
      session: { user: {} },
      token: { id: 1, role: "superadmin", storeId: null },
    });
    expect(result.user).toEqual({
      id: 1,
      role: "superadmin",
      storeId: null,
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: credential validation (login form)
// ──────────────────────────────────────────────────────────────────────────────

describe("login credential validation", () => {
  function validateCredentials(username: string, password: string): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!username || !username.trim()) errors.username = "Username is required";
    if (!password) errors.password = "Password is required";
    return errors;
  }

  it("returns no errors for valid credentials", () => {
    expect(validateCredentials("admin", "admin123")).toEqual({});
  });

  it("returns error for empty username", () => {
    const errors = validateCredentials("", "password");
    expect(errors.username).toBeDefined();
  });

  it("returns error for whitespace-only username", () => {
    const errors = validateCredentials("   ", "password");
    expect(errors.username).toBeDefined();
  });

  it("returns error for empty password", () => {
    const errors = validateCredentials("admin", "");
    expect(errors.password).toBeDefined();
  });

  it("returns both errors when both empty", () => {
    const errors = validateCredentials("", "");
    expect(Object.keys(errors).length).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: redirect after login
// ──────────────────────────────────────────────────────────────────────────────

describe("post-login redirect", () => {
  function getDashboard(role: string): string {
    if (role === "superadmin") return "/superadmin";
    if (role === "admin") return "/admin";
    return "/quotations";
  }

  it("superadmin → /superadmin", () => {
    expect(getDashboard("superadmin")).toBe("/superadmin");
  });

  it("admin → /admin", () => {
    expect(getDashboard("admin")).toBe("/admin");
  });

  it("manager → /quotations (from page.tsx root redirect)", () => {
    expect(getDashboard("manager")).toBe("/quotations");
  });

  it("staff → /quotations", () => {
    expect(getDashboard("staff")).toBe("/quotations");
  });
});
