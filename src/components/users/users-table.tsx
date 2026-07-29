"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, KeyRound, Loader2, UserCheck, UserX, Search, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  role: string;
  storeId: number | null;
  isActive: boolean;
  createdAt: string;
}

interface StoreInfo {
  id: number;
  name: string;
}

function UsersTableInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const urlStoreId = searchParams.get("storeId");

  const role = session?.user?.role?.toLowerCase();
  const isSuperAdmin = role === "superadmin";

  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStoreId, setFilterStoreId] = useState<string>(urlStoreId || "all");

  // Create User state
  const [formOpen, setFormOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState("staff");
  const [newUserStoreId, setNewUserStoreId] = useState<string>("");

  // Password reset state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const currentUserId = session?.user ? Number(session.user.id) : null;
  const currentUsername = session?.user?.name;

  useEffect(() => {
    if (urlStoreId) {
      setFilterStoreId(urlStoreId);
    }
  }, [urlStoreId]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (isSuperAdmin && filterStoreId !== "all") {
      p.set("storeId", filterStoreId);
    }
    const r = await fetch(`/api/users?${p}`);
    if (r.ok) {
      setUsers(await r.json());
    }
    setLoading(false);
  }, [isSuperAdmin, filterStoreId]);

  const fetchStores = useCallback(async () => {
    if (!isSuperAdmin) return;
    const r = await fetch("/api/stores");
    if (r.ok) {
      setStores(await r.json());
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
    fetchStores();
  }, [fetchUsers, fetchStores]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        role: userRole,
        storeId: userRole === "superadmin" ? null : (newUserStoreId ? parseInt(newUserStoreId) : null),
      }),
    });
    if (r.ok) {
      toast.success("User created");
      setFormOpen(false);
      setUsername("");
      setPassword("");
      setUserRole("staff");
      setNewUserStoreId("");
      fetchUsers();
    } else {
      const err = await r.json().catch(() => ({}));
      toast.error(err.error || "Failed to create user");
    }
  }

  async function toggle(u: User) {
    const isSelf =
      (currentUserId && u.id === currentUserId) ||
      u.username === currentUsername;
    if (isSelf) {
      toast.error("You cannot deactivate your own account");
      return;
    }

    const r = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });

    if (r.ok) {
      toast.success(u.isActive ? "User deactivated" : "User activated");
      fetchUsers();
    } else {
      const err = await r.json().catch(() => ({}));
      toast.error(err.error || "Failed to update user");
    }
  }

  async function roleChange(u: User, nr: string) {
    const isSelf =
      (currentUserId && u.id === currentUserId) ||
      u.username === currentUsername;
    if (isSelf) {
      toast.error("You cannot change your own role");
      return;
    }

    const r = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-role", role: nr }),
    });

    if (r.ok) {
      toast.success(`Role updated to ${nr}`);
      fetchUsers();
    } else {
      const err = await r.json().catch(() => ({}));
      toast.error(err.error || "Failed to update role");
    }
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser || !newPassword.trim()) {
      toast.error("Enter a new password");
      return;
    }

    setResetting(true);
    try {
      const r = await fetch(`/api/users/${resetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          password: newPassword.trim(),
        }),
      });

      if (r.ok) {
        toast.success(`Password updated for ${resetUser.username}`);
        setResetUser(null);
        setNewPassword("");
      } else {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || "Failed to reset password");
      }
    } catch {
      toast.error("Error resetting password");
    } finally {
      setResetting(false);
    }
  }

  function storeName(storeId: number | null) {
    if (storeId === null) return "—";
    return stores.find((s) => s.id === storeId)?.name || `#${storeId}`;
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            {isSuperAdmin ? "All Users" : "Users"}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add User
        </Button>
      </div>

      {/* Filter / Search Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search users by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isSuperAdmin && stores.length > 0 && (
          <Select
            value={filterStoreId}
            onValueChange={(v) => setFilterStoreId(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-44 h-9 text-[13px]">
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Mobile card list (hidden on sm+) ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <p className="text-center py-12 text-sm text-muted-foreground">
            Loading users...
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">
            No users found.
          </p>
        ) : (
          filteredUsers.map((u) => {
            const isSelf =
              (currentUserId && u.id === currentUserId) ||
              u.username === currentUsername;

            return (
              <Card key={u.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{u.username}</span>
                    {isSelf && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        You
                      </Badge>
                    )}
                  </div>
                  {u.isActive ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] flex items-center gap-1.5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] flex items-center gap-1.5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Inactive
                    </Badge>
                  )}
                </div>

                {isSuperAdmin && u.storeId !== null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StoreIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{storeName(u.storeId)}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground uppercase font-medium">Role</Label>
                  <Select
                    value={u.role}
                    onValueChange={(v) => roleChange(u, v ?? "staff")}
                    disabled={Boolean(isSelf)}
                  >
                    <SelectTrigger className="w-full h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && (
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      )}
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 shrink-0"
                    onClick={() => {
                      setResetUser(u);
                      setNewPassword("");
                    }}
                    title="Change Password"
                  >
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <div className="flex-1">
                    {u.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(isSelf)}
                        onClick={() => toggle(u)}
                        className="w-full h-9 text-xs font-medium border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      >
                        <UserX className="h-3.5 w-3.5 mr-1.5" /> Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(isSelf)}
                        onClick={() => toggle(u)}
                        className="w-full h-9 text-xs font-medium border-emerald-600/40 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 transition-colors"
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Activate
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Desktop table view (hidden on < sm) ── */}
      <Card className="hidden sm:block overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">
                Username
              </TableHead>
              {isSuperAdmin && (
                <TableHead className="text-[12px] font-semibold uppercase tracking-wider">
                  Store
                </TableHead>
              )}
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">
                Role
              </TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={isSuperAdmin ? 5 : 4}
                  className="text-center py-12 text-muted-foreground"
                >
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isSuperAdmin ? 5 : 4}
                  className="text-center py-12 text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const isSelf =
                  (currentUserId && u.id === currentUserId) ||
                  u.username === currentUsername;

                return (
                  <TableRow key={u.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <span>{u.username}</span>
                        {isSelf && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1.5"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-sm">
                        {storeName(u.storeId)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => roleChange(u, v ?? "staff")}
                        disabled={Boolean(isSelf)}
                      >
                        <SelectTrigger className="w-32 h-8 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isSuperAdmin && (
                            <SelectItem value="superadmin">Super Admin</SelectItem>
                          )}
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium flex items-center gap-1.5 w-fit"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium flex items-center gap-1.5 w-fit"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setResetUser(u);
                            setNewPassword("");
                          }}
                          title="Change Password"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        {u.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={Boolean(isSelf)}
                            onClick={() => toggle(u)}
                            className="h-8 text-[12px] font-medium border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" /> Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={Boolean(isSelf)}
                            onClick={() => toggle(u)}
                            className="h-8 text-[12px] font-medium border-emerald-600/40 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 transition-colors"
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={createUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={userRole}
                onValueChange={(v) => {
                  setUserRole(v ?? "staff");
                  if (v === "superadmin") setNewUserStoreId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && (
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  )}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && userRole !== "superadmin" && (
              <div className="space-y-1.5">
                <Label>Store *</Label>
                <Select
                  value={newUserStoreId}
                  onValueChange={(v) => setNewUserStoreId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full">
                Add User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={Boolean(resetUser)}
        onOpenChange={(open) => {
          if (!open) setResetUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Enter a new password for{" "}
              <span className="font-semibold text-foreground">
                {resetUser?.username}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleResetPasswordSubmit}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetUser(null)}
                disabled={resetting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={resetting}>
                {resetting && (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                )}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UsersTable() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Loading users...</div>}>
      <UsersTableInner />
    </Suspense>
  );
}
