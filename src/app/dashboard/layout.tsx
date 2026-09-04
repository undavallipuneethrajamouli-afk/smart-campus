import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav-config";
import { SignOutButton } from "@/components/sign-out-button";
import { DesktopNavLinks, MobileNavLinks } from "@/components/nav-links";

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
        <div className="border-b border-slate-200 bg-brand-600 px-5 py-4">
          <p className="text-sm font-semibold text-white">Smart Campus</p>
          <p className="mt-0.5 text-xs text-brand-100">Godavari Global University</p>
        </div>
        <p className="px-5 pt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          {profile.role.replace("_", " ")}
        </p>
        <DesktopNavLinks items={items} />
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <MobileNavLinks items={items} />
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
