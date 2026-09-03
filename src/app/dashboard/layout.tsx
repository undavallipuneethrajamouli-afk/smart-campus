import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav-config";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const items = NAV_ITEMS[profile.role] ?? [];

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">Smart Campus</p>
          <p className="mt-0.5 text-xs text-slate-500">{profile.role.replace("_", " ")}</p>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <nav className="flex gap-3 overflow-x-auto md:hidden">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-sm text-slate-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{profile.full_name}</span>
            <SignOutButton />
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
