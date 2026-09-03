import Link from "next/link";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile) redirect(dashboardPathForRole(profile.role));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Smart Campus</h1>
      <p className="mt-2 max-w-md text-slate-600">
        One platform for attendance, notes, fees, timetables, and campus life.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
