"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { UserForm } from "./user-form";
import { Plus, KeyRound, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export function UsersTable() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [fo, setFo] = useState(false);

  // Change Password Modal state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const currentUserId = session?.user ? Number(session.user.id) : null;
  const currentUsername = session?.user?.name;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/users");
    if (r.ok) {
      setUsers(await r.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function save(d: { username: string; password: string; role: string }) {
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    if (r.ok) {
      toast.success("User created successfully");
      fetchUsers();
    } else {
      const err = await r.json().catch(() => ({}));
      toast.error(err.error || "Failed to create user");
    }
  }

  async function toggle(u: User) {
    const isSelf = (currentUserId && u.id === currentUserId) || u.username === currentUsername;
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
      toast.error(err.error || "Failed to update user status");
    }
  }

  async function roleChange(u: User, nr: string) {
    const isSelf = (currentUserId && u.id === currentUserId) || u.username === currentUsername;
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
      toast.error("Please enter a new password");
      return;
    }

    setResetting(true);
    try {
      const r = await fetch(`/api/users/${resetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", password: newPassword.trim() }),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <Button onClick={() => setFo(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-44 text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map(u => {
                const isSelf =
                  (currentUserId && u.id === currentUserId) || u.username === currentUsername;

                return (
                  <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{u.username}</span>
                        {isSelf && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={v => roleChange(u, v ?? "staff")}
                        disabled={Boolean(isSelf)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "secondary"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setResetUser(u);
                            setNewPassword("");
                          }}
                          title="Change Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={Boolean(isSelf)}
                          onClick={() => toggle(u)}
                          title={isSelf ? "You cannot deactivate your own account" : undefined}
                          className={isSelf ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UserForm open={fo} onOpenChange={setFo} onSave={save} />

      {/* Change Password Dialog */}
      <Dialog
        open={Boolean(resetUser)}
        onOpenChange={open => {
          if (!open) setResetUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter a new password for user{" "}
              <span className="font-semibold text-foreground">{resetUser?.username}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetUser(null)}
                disabled={resetting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
