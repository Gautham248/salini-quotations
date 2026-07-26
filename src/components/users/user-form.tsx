"use client"; import { useState } from "react";
import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Label } from "@/components/ui/label"; import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export function UserForm({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (d: { username: string; password: string; role: string }) => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [r, setR] = useState("staff");
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
    <form onSubmit={e => { e.preventDefault(); onSave({ username: u, password: p, role: r }); onOpenChange(false); }} className="space-y-4">
      <div className="space-y-2"><Label>Username *</Label><Input value={u} onChange={e => setU(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Password *</Label><Input type="password" value={p} onChange={e => setP(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Role</Label><Select value={r} onValueChange={v => setR(v ?? "staff")}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="staff">Staff</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
      <Button type="submit" className="w-full">Add User</Button>
    </form></DialogContent></Dialog>;
}
