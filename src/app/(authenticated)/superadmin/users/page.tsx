"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: number; username: string; role: string; storeId: number | null; isActive: boolean; createdAt: string;
}
interface StoreInfo { id: number; name: string; }

function UsersContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStoreId = searchParams.get("storeId");

  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [filterStoreId, setFilterStoreId] = useState<string>("all");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [newUserStoreId, setNewUserStoreId] = useState<string>("");

  useEffect(() => {
    if (urlStoreId) {
      setFilterStoreId(urlStoreId);
    } else {
      setFilterStoreId("all");
    }
  }, [urlStoreId]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStoreId !== "all") p.set("storeId", filterStoreId);
    const r = await fetch(`/api/users?${p}`);
    if (r.ok) setUsers(await r.json());
    setLoading(false);
  }, [filterStoreId]);

  const fetchStores = async () => {
    const r = await fetch("/api/stores");
    if (r.ok) setStores(await r.json());
  };

  useEffect(() => { fetchUsers(); fetchStores(); }, [fetchUsers]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username, password, role,
        storeId: role === "superadmin" ? null : (newUserStoreId ? parseInt(newUserStoreId) : null),
      }),
    });
    if (r.ok) {
      toast.success("User created");
      setFormOpen(false);
      setUsername(""); setPassword(""); setRole("staff"); setNewUserStoreId("");
      fetchUsers();
    } else {
      const err = await r.json().catch(() => ({}));
      toast.error(err.error || "Failed to create user");
    }
  }

  async function toggle(u: User) {
    const r = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    if (r.ok) { toast.success(u.isActive ? "User deactivated" : "User activated"); fetchUsers(); }
    else { const err = await r.json().catch(() => ({})); toast.error(err.error || "Failed"); }
  }

  async function roleChange(u: User, nr: string) {
    const r = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-role", role: nr }),
    });
    if (r.ok) { toast.success(`Role updated to ${nr}`); fetchUsers(); }
    else { const err = await r.json().catch(() => ({})); toast.error(err.error || "Failed"); }
  }

  function storeName(storeId: number | null) {
    if (storeId === null) return "—";
    return stores.find(s => s.id === storeId)?.name || `#${storeId}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">All Users</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={filterStoreId}
            onValueChange={v => setFilterStoreId(v ?? "all")}
            items={{
              all: "All Stores",
              ...Object.fromEntries(stores.map(s => [String(s.id), s.name]))
            }}
          >
            <SelectTrigger className="w-40 h-8 text-[13px]">
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add User
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Username</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Store</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No users found.</TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                <TableCell className="font-medium text-sm">{u.username}</TableCell>
                <TableCell className="text-sm">{storeName(u.storeId)}</TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={v => roleChange(u, v ?? "staff")}
                    items={{ superadmin: "Super Admin", admin: "Admin", manager: "Manager", staff: "Staff" }}
                  >
                    <SelectTrigger className="w-32 h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "secondary"} className="text-[11px]">
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggle(u)}>
                    {u.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form onSubmit={createUser} className="space-y-3">
            <div className="space-y-1"><Label>Username *</Label><Input value={username} onChange={e => setUsername(e.target.value)} required /></div>
            <div className="space-y-1"><Label>Password *</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <div className="space-y-1"><Label>Role</Label>
              <Select
                value={role}
                onValueChange={v => { setRole(v ?? "staff"); if (v === "superadmin") setNewUserStoreId(""); }}
                items={{ superadmin: "Super Admin", admin: "Admin", manager: "Manager", staff: "Staff" }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== "superadmin" && (
              <div className="space-y-1"><Label>Store *</Label>
                <Select
                  value={newUserStoreId}
                  onValueChange={v => setNewUserStoreId(v ?? "")}
                  items={Object.fromEntries(stores.map(s => [String(s.id), s.name]))}
                >
                  <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                  <SelectContent>
                    {stores.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full">Add User</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SuperAdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Loading users...</div>}>
      <UsersContent />
    </Suspense>
  );
}
