import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function StudentAttendancePage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("attendance")
    .select("date, status, subjects(id, name)")
    .eq("student_id", profile.id)
    .order("date", { ascending: false });

  const { data: lateLogs } = await supabase
    .from("late_logs")
    .select("reason, created_at, attendance!inner(date, student_id, subjects(name))")
    .eq("attendance.student_id", profile.id)
    .order("created_at", { ascending: false });

  const bySubject = new Map<string, { name: string; present: number; total: number }>();
  for (const r of records ?? []) {
    const subject = r.subjects as unknown as { id: string; name: string } | null;
    if (!subject) continue;
    const entry = bySubject.get(subject.id) ?? { name: subject.name, present: 0, total: 0 };
    entry.total += 1;
    if (r.status !== "ABSENT") entry.present += 1;
    bySubject.set(subject.id, entry);
  }

  const totalPresent = (records ?? []).filter((r) => r.status !== "ABSENT").length;
  const totalRecords = records?.length ?? 0;
  const overallPct = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500">
          {overallPct !== null
            ? `Overall attendance: ${overallPct}% (${totalRecords} classes recorded)`
            : "No attendance recorded yet."}
        </p>
      </div>

      <Card title="Subject-wise attendance">
        {bySubject.size > 0 ? (
          <div className="space-y-3">
            {Array.from(bySubject.values()).map((s) => {
              const pct = Math.round((s.present / s.total) * 100);
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span className={pct < 75 ? "text-red-600" : "text-slate-600"}>
                      {pct}% ({s.present}/{s.total})
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${pct < 75 ? "bg-red-500" : "bg-green-600"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No attendance recorded yet." />
        )}
      </Card>

      <Card title="Attendance history">
        {records && records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{r.date}</td>
                    <td className="py-2 pr-4">
                      {(r.subjects as unknown as { name: string } | null)?.name}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === "PRESENT"
                            ? "bg-green-100 text-green-700"
                            : r.status === "LATE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No attendance history yet." />
        )}
      </Card>

      <Card title="Late records">
        {lateLogs && lateLogs.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {lateLogs.map((l, i) => {
              const att = l.attendance as unknown as {
                date: string;
                subjects: { name: string } | null;
              };
              return (
                <li key={i} className="py-2 text-sm">
                  <span className="font-medium text-slate-800">{att.date}</span>{" "}
                  <span className="text-slate-600">
                    {att.subjects?.name} — {l.reason}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="No late records." />
        )}
      </Card>
    </div>
  );
}
