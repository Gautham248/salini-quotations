"use client"; import { useState, useEffect } from "react"; import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; import { Separator } from "@/components/ui/separator";
import { toast } from "sonner"; import { Package, FileText, Users } from "lucide-react"; import Link from "next/link";
export default function AdminDashboard() {
  const { data: session } = useSession();
  const [s, setS] = useState({ companyName:"", subheading:"", phone:"", mobile:"", email:"", gstin:"", bankDetails:"", disclaimerText:"", loadingNote:"" });
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetch("/api/settings").then(r => r.json()).then(setS); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); setLoading(true); const r = await fetch("/api/settings", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(s) }); toast[r.ok ? "success" : "error"](r.ok ? "Saved" : "Failed"); setLoading(false); }
  const links = [{ href:"/admin/items", label:"Master Items", icon:Package, desc:"Manage catalog" },{ href:"/admin/users", label:"Users", icon:Users, desc:"Manage staff" },{ href:"/admin/quotations", label:"All Quotations", icon:FileText, desc:"View all quotes" }];
  return <div className="space-y-6 max-w-2xl">
    <div><h1 className="text-2xl font-bold">Admin Dashboard</h1><p className="text-muted-foreground mt-1">Welcome, {session?.user?.name}.</p></div>
    <div className="grid grid-cols-3 gap-4">{links.map(l => <Link key={l.href} href={l.href}><Card className="hover:bg-accent transition-colors cursor-pointer h-full"><CardContent className="p-4 flex items-center gap-3"><l.icon className="h-5 w-5 text-muted-foreground shrink-0"/><div><p className="font-medium text-sm">{l.label}</p><p className="text-xs text-muted-foreground">{l.desc}</p></div></CardContent></Card></Link>)}</div>
    <Card><CardHeader><CardTitle>Company Settings</CardTitle><CardDescription>These appear on every quotation PDF.</CardDescription></CardHeader><CardContent><form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Company Name</Label><Input value={s.companyName} onChange={e => setS({...s, companyName: e.target.value})}/></div>
        <div className="space-y-2"><Label>Subheading</Label><Input value={s.subheading} onChange={e => setS({...s, subheading: e.target.value})}/></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={s.phone} onChange={e => setS({...s, phone: e.target.value})}/></div>
        <div className="space-y-2"><Label>Mobile</Label><Input value={s.mobile} onChange={e => setS({...s, mobile: e.target.value})}/></div>
        <div className="space-y-2"><Label>Email</Label><Input value={s.email} onChange={e => setS({...s, email: e.target.value})}/></div>
        <div className="space-y-2"><Label>GSTIN</Label><Input value={s.gstin} onChange={e => setS({...s, gstin: e.target.value})}/></div>
      </div><Separator/>
      <div className="space-y-2"><Label>Bank Details</Label><Input value={s.bankDetails} onChange={e => setS({...s, bankDetails: e.target.value})}/></div>
      <div className="space-y-2"><Label>Disclaimer</Label><Input value={s.disclaimerText} onChange={e => setS({...s, disclaimerText: e.target.value})}/></div>
      <div className="space-y-2"><Label>Loading Note</Label><Input value={s.loadingNote} onChange={e => setS({...s, loadingNote: e.target.value})}/></div>
      <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Settings"}</Button>
    </form></CardContent></Card>
  </div>;
}
