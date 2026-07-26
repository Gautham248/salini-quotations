"use client"; import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"; import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; import { Badge } from "@/components/ui/badge"; import { UserForm } from "./user-form";
import { Plus, KeyRound } from "lucide-react"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; import { toast } from "sonner";
interface User { id: number; username: string; role: string; isActive: boolean; createdAt: string; }
export function UsersTable() {
  const [users, setUsers] = useState<User[]>([]); const [loading, setLoading] = useState(true); const [fo, setFo] = useState(false);
  const fetchUsers = useCallback(async () => { setLoading(true); const r = await fetch("/api/users"); setUsers(await r.json()); setLoading(false); }, []);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  async function save(d: { username: string; password: string; role: string }) { const r = await fetch("/api/users", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(d) }); if (r.ok) { toast.success("User created"); fetchUsers(); } else toast.error("Failed"); }
  async function toggle(u: User) { await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "toggle" }) }); toast.success(u.isActive ? "Deactivated" : "Activated"); fetchUsers(); }
  async function roleChange(u: User, nr: string) { await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "update-role", role: nr }) }); toast.success(`Role: ${nr}`); fetchUsers(); }
  async function resetPw(u: User) { const p = prompt("New password:"); if (!p) return; await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "reset-password", password: p }) }); toast.success("Password reset"); }
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Users</h1><Button onClick={() => setFo(true)}><Plus className="h-4 w-4 mr-2"/>Add User</Button></div>
    <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="w-40">Actions</TableHead></TableRow></TableHeader>
      <TableBody>{loading ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : users.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users.</TableCell></TableRow> : users.map(u => <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}><TableCell className="font-medium">{u.username}</TableCell><TableCell><Select value={u.role} onValueChange={v => roleChange(u, v ?? "staff")}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select></TableCell><TableCell><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => resetPw(u)}><KeyRound className="h-4 w-4"/></Button><Button variant="ghost" size="sm" onClick={() => toggle(u)}>{u.isActive ? "Deactivate" : "Activate"}</Button></div></TableCell></TableRow>)}</TableBody></Table></div>
    <UserForm open={fo} onOpenChange={setFo} onSave={save}/>
  </div>;
}
