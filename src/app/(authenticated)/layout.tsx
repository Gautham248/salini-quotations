import { Sidebar } from "@/components/layout/sidebar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
