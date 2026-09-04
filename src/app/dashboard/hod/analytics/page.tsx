import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { attendancePct, AT_RISK_ATTENDANCE_THRESHOLD } from "@/lib/risk";

export default async function HodAnalyticsPage() {
  await requireRole(["HOD", "ADMIN"]);
  const supabase = await createClient();

  const { data: attendance } = await supabase.from("attendance").select("student_id, status");

  const byStudent = new Map<string, { present: number; total: number }>();
  for (const a of attendance ?? []) {
    const entry = byStudent.get(a.student_id) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (a.status !== "ABSENT") entry.present += 1;
    byStudent.set(a.student_id, entry);
  }

  const studentIds = Array.from(byStudent.keys());
  const { data: students } = studentIds.length
    ? await supabase
        .from("students")
        .select("id, roll_number, section, departments(name), profiles(full_name)")
        .in("id", studentIds)
    : { data: [] };

  const atRisk = (students ?? [])
    .map((s) => {
      const stats = byStudent.get(s.id)!;
      const pct = attendancePct(stats.present, stats.total);
      return { ...s, pct, total: stats.total };
    })
    .filter((s) => s.pct !== null && s.pct < AT_RISK_ATTENDANCE_THRESHOLD)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

  const overallPct =
    attendance && attendance.length > 0
      ? Math.round(
          ((attendance.filter((a) => a.status !== "ABSENT").length / attendance.length) * 100),
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Department Analytics</h1>
        <p className="text-sm text-slate-500">
          Rule-based academic alerts — not a medical or psychological assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Overall attendance">
          <p className="text-2xl font-bold text-slate-900">
            {overallPct !== null ? `${overallPct}%` : "—"}
          </p>
          <p className="text-xs text-slate-500">Across all recorded classes</p>
        </Card>
        <Card title="Students needing attention">
          <p className="text-2xl font-bold text-slate-900">{atRisk.length}</p>
          <p className="text-xs text-slate-500">Attendance below {AT_RISK_ATTENDANCE_THRESHOLD}%</p>
        </Card>
      </div>

      <Card title="At-risk students">
        {atRisk.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Roll No</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Section</th>
                <th className="py-2">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{s.roll_number}</td>
                  <td className="py-2 pr-4">
                    {(s.profiles as unknown as { full_name: string } | null)?.full_name}
                  </td>
                  <td className="py-2 pr-4">
                    {(s.departments as unknown as { name: string } | null)?.name}
                  </td>
                  <td className="py-2 pr-4">{s.section}</td>
                  <td className="py-2 font-medium text-red-600">{s.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No students are currently below the attendance threshold." />
        )}
      </Card>
    </div>
  );
}
