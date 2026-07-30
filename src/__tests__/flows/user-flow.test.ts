/**
 * User Flow — create, read, update role, toggle, reset password, delete sequence
 *
 * Runs as admin (requires admin+ for user management).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loginAs, logout, api } from "./helpers";

let createdUserId: number;
let adminStoreId: number | null;

describe("User Flow", () => {
  beforeAll(async () => {
    const result = await loginAs("admin", "admin123");
    expect(result.ok).toBe(true);
    adminStoreId = result.storeId!;
    expect(adminStoreId).toBeGreaterThan(0);
  });

  describe("Step 1 — List existing users", () => {
    it("GET /api/users returns list of users", async () => {
      const res = await api.get("/api/users");
      expect(res.status).toBe(200);
      const users = res.body as Array<{ id: number; username: string; role: string }>;
      expect(users.length).toBeGreaterThan(0);
    });

    it("users list excludes password hashes", async () => {
      const res = await api.get("/api/users");
      const user = (res.body as Array<Record<string, unknown>>)[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("role");
      expect((user as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe("Step 2 — Create user", () => {
    it("POST /api/users creates a new user", async () => {
      const res = await api.post("/api/users", {
        username: "flowtestuser",
        password: "test1234",
        role: "staff",
      });

      expect(res.status).toBe(201);
      const body = res.body as Record<string, unknown>;
      expect(body.username).toBe("flowtestuser");
      expect(body.role).toBe("staff");
      expect(body.storeId).toBe(adminStoreId);
      expect(typeof body.id).toBe("number");
      createdUserId = body.id as number;
    });

    it("new user appears in GET /api/users list", async () => {
      const res = await api.get("/api/users");
      const users = res.body as Array<{ id: number; username: string }>;
      const found = users.find((u) => u.id === createdUserId);
      expect(found).toBeDefined();
      expect(found!.username).toBe("flowtestuser");
    });
  });

  describe("Step 3 — Login as new user", () => {
    it("new user can login with their credentials", async () => {
      const result = await loginAs("flowtestuser", "test1234");
      expect(result.ok).toBe(true);
      expect(result.role).toBe("staff");
      expect(result.storeId).toBe(adminStoreId);
    });
  });

  describe("Step 4 — Update user role", () => {
    beforeAll(async () => {
      const result = await loginAs("admin", "admin123");
      expect(result.ok).toBe(true);
    });

    it("PATCH /api/users/[id] with action=update-role changes role", async () => {
      const res = await api.patch(`/api/users/${createdUserId}`, {
        action: "update-role",
        role: "admin",
      });

      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.role).toBe("admin");
    });
  });

  describe("Step 5 — Toggle user active status", () => {
    it("PATCH /api/users/[id] with action=toggle deactivates user", async () => {
      const res = await api.patch(`/api/users/${createdUserId}`, {
        action: "toggle",
      });

      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.isActive).toBe(false);
    });

    it("deactivated user cannot login", async () => {
      const result = await loginAs("flowtestuser", "test1234");
      expect(result.ok).toBe(false);
    });

    it("toggle back to active", async () => {
      await loginAs("admin", "admin123");
      const res = await api.patch(`/api/users/${createdUserId}`, {
        action: "toggle",
      });
      const body = res.body as Record<string, unknown>;
      expect(body.isActive).toBe(true);
    });
  });

  describe("Step 6 — Reset user password", () => {
    beforeAll(async () => {
      const result = await loginAs("admin", "admin123");
      expect(result.ok).toBe(true);
    });

    it("PATCH /api/users/[id] with action=reset-password changes password", async () => {
      const res = await api.patch(`/api/users/${createdUserId}`, {
        action: "reset-password",
        password: "newpass123",
      });

      expect(res.status).toBe(200);
    });

    it("old password no longer works", async () => {
      const result = await loginAs("flowtestuser", "test1234");
      expect(result.ok).toBe(false);
    });

    it("new password works", async () => {
      const result = await loginAs("flowtestuser", "newpass123");
      expect(result.ok).toBe(true);
    });
  });

  describe("Step 7 — Delete user", () => {
    beforeAll(async () => {
      const result = await loginAs("admin", "admin123");
      expect(result.ok).toBe(true);
    });

    it("DELETE /api/users/[id] removes the user", async () => {
      const res = await api.del(`/api/users/${createdUserId}`);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.success).toBe(true);
    });

    it("deleted user no longer appears in list", async () => {
      const res = await api.get("/api/users");
      const users = res.body as Array<{ id: number }>;
      const found = users.find((u) => u.id === createdUserId);
      expect(found).toBeUndefined();
    });

    it("deleted user cannot login", async () => {
      const result = await loginAs("flowtestuser", "newpass123");
      expect(result.ok).toBe(false);
    });
  });

  describe("Step 8 — Validation", () => {
    beforeAll(async () => {
      const result = await loginAs("admin", "admin123");
      expect(result.ok).toBe(true);
    });

    it("POST without username returns 400", async () => {
      const res = await api.post("/api/users", { password: "test1234" });
      expect(res.status).toBe(400);
      expect((res.body as Record<string, unknown>).error).toBe("Username is required");
    });

    it("POST with short password returns 400", async () => {
      const res = await api.post("/api/users", { username: "testuser2", password: "ab" });
      expect(res.status).toBe(400);
    });

    it("POST with duplicate username returns 409", async () => {
      const res = await api.post("/api/users", { username: "admin", password: "test1234" });
      expect(res.status).toBe(409);
    });

    it("PATCH own account returns 400 (self-modification blocked)", async () => {
      const usersRes = await api.get("/api/users");
      const users = usersRes.body as Array<{ id: number; username: string }>;
      const admin = users.find((u) => u.username === "admin");
      expect(admin).toBeDefined();

      const res = await api.patch(`/api/users/${admin!.id}`, { action: "toggle" });
      expect(res.status).toBe(400);
    });
  });

  afterAll(async () => {
    await logout();
  });
});
