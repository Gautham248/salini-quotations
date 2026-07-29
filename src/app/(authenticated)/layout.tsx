import { Sidebar } from "@/components/layout/sidebar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-3 sm:p-5 lg:p-8 pb-24 md:pb-8">{children}</div>
      </main>
    </div>
  );
}
