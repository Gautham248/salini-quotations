import { auth } from "@/lib/auth"; import { redirect } from "next/navigation";
export default async function Home() { const s = await auth(); if (!s?.user) redirect("/login"); redirect(s.user.role === "admin" ? "/admin" : "/quotations"); }
