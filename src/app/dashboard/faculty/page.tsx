import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { attendancePct, AT_RISK_ATTENDANCE_THRESHOLD } from "@/lib/risk";

export default async function FacultyDashboard() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("faculty_subjects")
    .select("subject_id, section, academic_year, subjects(name, code)")
    .eq("faculty_id", profile.id);

  const subjectIds = Array.from(new Set((assignments ?? []).map((a) => a.subject_id)));

  const { data: attendance } = subjectIds.length
    ? await supabase
        .from("attendance")
        .select("student_id, status")
        .in("subject_id", subjectIds)
        .eq("faculty_id", profile.id)
    : { data: [] };

  const byStudent = new Map<string, { present: number; total: number }>();
  for (const a of attendance ?? []) {
    const entry = byStudent.get(a.student_id) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (a.status !== "ABSENT") entry.present += 1;
    byStudent.set(a.student_id, entry);
  }

  const atRiskIds = Array.from(byStudent.entries())
    .filter(([, stats]) => {
      const pct = attendancePct(stats.present, stats.total);
      return pct !== null && pct < AT_RISK_ATTENDANCE_THRESHOLD;
    })
    .map(([id]) => id);

  const { data: atRiskStudents } = atRiskIds.length
    ? await supabase
        .from("students")
        .select("id, roll_number, section, profiles(full_name)")
        .in("id", atRiskIds)
    : { data: [] };

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
          <EmptyState message="No subjects assigned yet. Add one under My Classes." />
        )}
      </Card>

      <Card title="Students at risk">
        {atRiskStudents && atRiskStudents.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {atRiskStudents.map((s) => {
              const stats = byStudent.get(s.id)!;
              const pct = attendancePct(stats.present, stats.total);
              return (
                <li key={s.id} className="flex justify-between py-2 text-sm">
                  <span className="text-slate-800">
                    {(s.profiles as unknown as { full_name: string } | null)?.full_name} ·{" "}
                    {s.roll_number}
                  </span>
                  <span className="font-medium text-red-600">{pct}%</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="No students below the attendance threshold in your classes." />
        )}
      </Card>
    </div>
  );
}
