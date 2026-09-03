import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

const QUICK_ACTIONS = [
  { label: "Attendance", href: "/dashboard/student/attendance" },
  { label: "Notes", href: "/dashboard/student/notes" },
  { label: "Timetable", href: "/dashboard/student/timetable" },
  { label: "Fees", href: "/dashboard/student/fees" },
  { label: "Digital ID", href: "/dashboard/student/id" },
];

export default async function StudentDashboard() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("*, departments(name)")
    .eq("id", profile.id)
    .single();

  const { data: attendance } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", profile.id);

  const totalMarked = attendance?.length ?? 0;
  const present = attendance?.filter((a) => a.status !== "ABSENT").length ?? 0;
  const attendancePct = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : null;

  const { data: fees } = await supabase.from("fees").select("amount").eq("student_id", profile.id);
  const totalFees = fees?.reduce((sum, f) => sum + Number(f.amount), 0) ?? 0;

  const { data: transactions } = await supabase
    .from("fee_transactions")
    .select("amount_paid, fees!inner(student_id)")
    .eq("fees.student_id", profile.id);
  const totalPaid = transactions?.reduce((sum, t) => sum + Number(t.amount_paid), 0) ?? 0;
  const pendingFees = Math.max(totalFees - totalPaid, 0);

  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const { data: todayClasses } = student?.department_id
    ? await supabase
        .from("timetable")
        .select("start_time, end_time, room, subjects(name), faculty(id, profiles(full_name))")
        .eq("department_id", student.department_id)
        .eq("section", student.section)
        .eq("day_of_week", todayDow)
        .order("start_time")
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">
          {student?.departments?.name ?? "No department set"}
          {student ? ` · Year ${student.year} · Section ${student.section} · Roll ${student.roll_number}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Attendance">
          <p className="text-2xl font-bold text-slate-900">
            {attendancePct !== null ? `${attendancePct}%` : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {totalMarked > 0 ? `${totalMarked} classes recorded` : "No attendance recorded yet"}
          </p>
        </Card>
        <Card title="Pending Fees">
          <p className="text-2xl font-bold text-slate-900">₹{pendingFees.toLocaleString()}</p>
          <p className="text-xs text-slate-500">
            {fees && fees.length > 0 ? "of total dues" : "No fees assigned yet"}
          </p>
        </Card>
        <Card title="Today's Classes">
          <p className="text-2xl font-bold text-slate-900">{todayClasses?.length ?? 0}</p>
          <p className="text-xs text-slate-500">scheduled today</p>
        </Card>
      </div>

      <Card title="Today's Timetable">
        {todayClasses && todayClasses.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {todayClasses.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-800">
                  {(c.subjects as unknown as { name: string } | null)?.name ?? "Subject"}
                </span>
                <span className="text-slate-500">
                  {c.start_time}–{c.end_time} · Room {c.room ?? "TBA"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No classes scheduled for today yet." />
        )}
      </Card>

      <Card title="Quick actions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-md border border-slate-200 px-3 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
