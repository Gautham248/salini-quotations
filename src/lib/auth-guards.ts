import { auth } from "./auth";
import { redirect } from "next/navigation";
export async function getSession() { return auth(); }
export async function requireAuth() { const s = await auth(); if (!s?.user) redirect("/login"); return s; }
export async function requireAdmin() { const s = await requireAuth(); if (s.user.role !== "admin") redirect("/quotations"); return s; }
