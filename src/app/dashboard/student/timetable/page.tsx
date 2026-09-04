import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default async function StudentTimetablePage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("department_id, section")
    .eq("id", profile.id)
    .single();

  const { data: entries } = student?.department_id
    ? await supabase
        .from("timetable")
        .select("day_of_week, start_time, end_time, room, subjects(name), faculty(profiles(full_name))")
        .eq("department_id", student.department_id)
        .eq("section", student.section)
        .order("day_of_week")
        .order("start_time")
    : { data: [] };

  const byDay = new Map<number, typeof entries>();
  for (const e of entries ?? []) {
    const list = byDay.get(e.day_of_week) ?? [];
    list.push(e);
    byDay.set(e.day_of_week, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Timetable</h1>
        <p className="text-sm text-slate-500">Your weekly class schedule.</p>
      </div>

      {entries && entries.length > 0 ? (
        <div className="space-y-4">
          {DAYS.map((label, i) => {
            const dayNum = i + 1;
            const dayEntries = byDay.get(dayNum);
            if (!dayEntries || dayEntries.length === 0) return null;
            return (
              <Card key={dayNum} title={label}>
                <ul className="divide-y divide-slate-100">
                  {dayEntries.map((e, idx) => (
                    <li key={idx} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">
                          {(e.subjects as unknown as { name: string } | null)?.name}
                        </p>
                        <p className="text-slate-500">
                          {(e.faculty as unknown as { profiles: { full_name: string } | null } | null)
                            ?.profiles?.full_name ?? "TBA"}
                        </p>
                      </div>
                      <span className="text-slate-500">
                        {e.start_time}–{e.end_time} · Room {e.room ?? "TBA"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState message="No timetable has been set up for your section yet." />
        </Card>
      )}
    </div>
  );
}
