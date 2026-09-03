import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function FacultyDashboard() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("faculty_subjects")
    .select("section, academic_year, subjects(name, code)")
    .eq("faculty_id", profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">Faculty dashboard</p>
      </div>

      <Card title="Assigned subjects">
        {assignments && assignments.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {assignments.map((a, i) => (
              <li key={i} className="py-2 text-sm">
                <span className="font-medium text-slate-800">
                  {(a.subjects as unknown as { name: string } | null)?.name}
                </span>{" "}
                <span className="text-slate-500">· Section {a.section}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No subjects assigned yet. Contact your admin/HOD." />
        )}
      </Card>
    </div>
  );
}
