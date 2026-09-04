import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/card";
import { attendancePct, AT_RISK_ATTENDANCE_THRESHOLD } from "@/lib/risk";

export default async function AdminAnalyticsPage() {
  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const [
    { count: studentCount },
    { count: facultyCount },
    { data: attendance },
    { data: fees },
    { data: transactions },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("faculty").select("*", { count: "exact", head: true }),
    supabase.from("attendance").select("student_id, status"),
    supabase.from("fees").select("amount"),
    supabase.from("fee_transactions").select("amount_paid"),
  ]);

  const overallPct =
    attendance && attendance.length > 0
      ? Math.round(
          (attendance.filter((a) => a.status !== "ABSENT").length / attendance.length) * 100,
        )
      : null;

  const byStudent = new Map<string, { present: number; total: number }>();
  for (const a of attendance ?? []) {
    const entry = byStudent.get(a.student_id) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (a.status !== "ABSENT") entry.present += 1;
    byStudent.set(a.student_id, entry);
  }
  const atRiskCount = Array.from(byStudent.values()).filter((s) => {
    const pct = attendancePct(s.present, s.total);
    return pct !== null && pct < AT_RISK_ATTENDANCE_THRESHOLD;
  }).length;

  const totalFees = (fees ?? []).reduce((s, f) => s + Number(f.amount), 0);
  const totalPaid = (transactions ?? []).reduce((s, t) => s + Number(t.amount_paid), 0);
  const totalPending = Math.max(totalFees - totalPaid, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Campus-wide metrics computed from live data.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total Students">
          <p className="text-2xl font-bold text-slate-900">{studentCount ?? 0}</p>
        </Card>
        <Card title="Total Faculty">
          <p className="text-2xl font-bold text-slate-900">{facultyCount ?? 0}</p>
        </Card>
        <Card title="Average Attendance">
          <p className="text-2xl font-bold text-slate-900">
            {overallPct !== null ? `${overallPct}%` : "—"}
          </p>
        </Card>
        <Card title="Students At Risk">
          <p className="text-2xl font-bold text-slate-900">{atRiskCount}</p>
          <p className="text-xs text-slate-500">Below {AT_RISK_ATTENDANCE_THRESHOLD}% attendance</p>
        </Card>
        <Card title="Pending Fees">
          <p className="text-2xl font-bold text-slate-900">₹{totalPending.toLocaleString()}</p>
        </Card>
        <Card title="Active Events">
          <p className="text-2xl font-bold text-slate-900">—</p>
          <p className="text-xs text-slate-500">Events module not set up yet</p>
        </Card>
      </div>
    </div>
  );
}
