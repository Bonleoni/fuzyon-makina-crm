import Link from "next/link";
import { LayoutDashboard, Users, Mail, Bot, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/agents", label: "Agents", icon: Bot },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/**
 * Admin paneli iskeleti:
 * - Üst bar tam genişlikte (tek sürekli border çizgisi)
 * - Sol menü + içerik alanı hizalı
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail = "Oturum yok";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      userEmail = user.email;
    }
  } catch {
    // Ortam değişkenleri henüz yoksa layout yine de render edilir
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      {/* Tek sürekli üst çizgi için tam genişlik header */}
      <header className="flex h-14 shrink-0 items-center border-b border-zinc-200 bg-white">
        <div className="flex h-full w-60 shrink-0 items-center border-r border-zinc-200 px-5">
          <div>
            <p className="text-sm font-semibold tracking-tight">Fuzyon Makina</p>
            <p className="text-xs text-zinc-500">İhracat CRM</p>
          </div>
        </div>
        <div className="flex h-full min-w-0 flex-1 items-center justify-between px-6">
          <h1 className="text-sm font-medium text-zinc-700">Admin Panel</h1>
          <p className="truncate text-sm text-zinc-500">{userEmail}</p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
