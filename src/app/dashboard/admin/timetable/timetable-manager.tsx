"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentAcademicYear } from "@/lib/academic-year";
import { Card, EmptyState } from "@/components/card";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

interface Option {
  id: string;
  label: string;
}

interface Entry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subjects: { name: string } | null;
  faculty: { profiles: { full_name: string } | null } | null;
}

export function TimetableManager({ departments }: { departments: { id: string; name: string }[] }) {
  const supabase = createClient();
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [section, setSection] = useState("A");
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<Option[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [subjectId, setSubjectId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [room, setRoom] = useState("");

  useEffect(() => {
    if (!departmentId) return;
    let cancelled = false;

    async function load() {
      const [{ data: subs }, { data: fac }, { data: tt }] = await Promise.all([
        supabase.from("subjects").select("id, name").eq("department_id", departmentId),
        supabase
          .from("faculty")
          .select("id, profiles(full_name)")
          .eq("department_id", departmentId),
        supabase
          .from("timetable")
          .select("id, day_of_week, start_time, end_time, room, subjects(name), faculty(profiles(full_name))")
          .eq("department_id", departmentId)
          .eq("section", section)
          .order("day_of_week")
          .order("start_time"),
      ]);

      if (cancelled) return;
      const subOpts = (subs ?? []).map((s) => ({ id: s.id, label: s.name }));
      const facOpts = (fac ?? []).map((f) => ({
        id: f.id,
        label: (f.profiles as unknown as { full_name: string } | null)?.full_name ?? "Faculty",
      }));
      setSubjects(subOpts);
      setFacultyOptions(facOpts);
      setSubjectId(subOpts[0]?.id ?? "");
      setFacultyId(facOpts[0]?.id ?? "");
      setEntries((tt as unknown as Entry[]) ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, section]);

  async function reloadEntries() {
    const { data: tt } = await supabase
      .from("timetable")
      .select("id, day_of_week, start_time, end_time, room, subjects(name), faculty(profiles(full_name))")
      .eq("department_id", departmentId)
      .eq("section", section)
      .order("day_of_week")
      .order("start_time");
    setEntries((tt as unknown as Entry[]) ?? []);
  }

  async function handleAdd() {
    if (!subjectId || !facultyId) {
      setError("Add a subject and faculty member to this department first.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("timetable").insert({
      department_id: departmentId,
      section,
      academic_year: currentAcademicYear(),
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      subject_id: subjectId,
      faculty_id: facultyId,
      room: room || null,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRoom("");
    reloadEntries();
  }

  async function handleDelete(id: string) {
    await supabase.from("timetable").delete().eq("id", id);
    reloadEntries();
  }

  return (
    <div className="space-y-6">
      <Card title="Select class">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Section</label>
            <input
              value={section}
              onChange={(e) => setSection(e.target.value.toUpperCase())}
              className="mt-1 w-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      <Card title="Add a period">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Day</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">End time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Faculty</label>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {facultyOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Room (optional)</label>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleAdd}
          disabled={loading || subjects.length === 0 || facultyOptions.length === 0}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add period"}
        </button>
        {(subjects.length === 0 || facultyOptions.length === 0) && (
          <p className="mt-2 text-xs text-slate-400">
            This department needs at least one subject and one faculty member first.
          </p>
        )}
      </Card>

      <Card title={`Schedule — ${section}`}>
        {entries.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Day</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Faculty</th>
                <th className="py-2 pr-4">Room</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{DAYS.find((d) => d.value === e.day_of_week)?.label}</td>
                  <td className="py-2 pr-4">
                    {e.start_time}–{e.end_time}
                  </td>
                  <td className="py-2 pr-4">{e.subjects?.name}</td>
                  <td className="py-2 pr-4">{e.faculty?.profiles?.full_name}</td>
                  <td className="py-2 pr-4">{e.room ?? "—"}</td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No periods scheduled for this section yet." />
        )}
      </Card>
    </div>
  );
}
