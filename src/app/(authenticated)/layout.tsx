import { Sidebar } from "@/components/layout/sidebar";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen"><Sidebar /><main className="flex-1 overflow-auto p-6">{children}</main></div>;
}
