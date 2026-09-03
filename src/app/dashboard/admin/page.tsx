import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/card";

export default async function AdminDashboard() {
  const profile = await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const [{ count: studentCount }, { count: facultyCount }, { count: deptCount }] =
    await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("faculty").select("*", { count: "exact", head: true }),
      supabase.from("departments").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">Admin dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total Students">
          <p className="text-2xl font-bold text-slate-900">{studentCount ?? 0}</p>
        </Card>
        <Card title="Total Faculty">
          <p className="text-2xl font-bold text-slate-900">{facultyCount ?? 0}</p>
        </Card>
        <Card title="Departments">
          <p className="text-2xl font-bold text-slate-900">{deptCount ?? 0}</p>
        </Card>
      </div>
    </div>
  );
}
