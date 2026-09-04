"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/card";
import type { AttendanceStatus } from "@/types/db";

interface Assignment {
  id: string;
  subjectId: string;
  section: string;
  academicYear: string;
  subjectName: string;
}

interface RosterRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  status: AttendanceStatus;
  lateReason: string;
}

const LATE_REASONS = ["Transport delay", "Medical reason", "Personal reason", "Other"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceMarker({ assignments }: { assignments: Assignment[] }) {
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const [date, setDate] = useState(todayIso());
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignment = assignments.find((a) => a.id === assignmentId);

  useEffect(() => {
    if (!assignment) return;
    let cancelled = false;

    async function loadRoster() {
      setLoading(true);
      setError(null);
      setMessage(null);
      const supabase = createClient();

      const { data: enrolled, error: enrollError } = await supabase
        .from("enrollments")
        .select("student_id, students!inner(roll_number, section, profiles(full_name))")
        .eq("subject_id", assignment!.subjectId)
        .eq("academic_year", assignment!.academicYear)
        .eq("students.section", assignment!.section);

      if (enrollError) {
        if (!cancelled) {
          setError(enrollError.message);
          setLoading(false);
        }
        return;
      }

      const { data: existing } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("subject_id", assignment!.subjectId)
        .eq("date", date);

      const existingByStudent = new Map((existing ?? []).map((e) => [e.student_id, e.status]));

      const rows: RosterRow[] = (enrolled ?? [])
        .map((e) => {
          const student = e.students as unknown as {
            roll_number: string;
            profiles: { full_name: string } | null;
          };
          return {
            studentId: e.student_id,
            rollNumber: student.roll_number,
            fullName: student.profiles?.full_name ?? "Unknown",
            status: (existingByStudent.get(e.student_id) as AttendanceStatus) ?? "PRESENT",
            lateReason: "",
          };
        })
        .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

      if (!cancelled) {
        setRoster(rows);
        setLoading(false);
      }
    }

    loadRoster();
    return () => {
      cancelled = true;
    };
  }, [assignment, date]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  function setLateReason(studentId: string, lateReason: string) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, lateReason } : r)));
  }

  async function handleSave() {
    if (!assignment) return;

    const missingReason = roster.some((r) => r.status === "LATE" && !r.lateReason);
    if (missingReason) {
      setError("Select a reason for every student marked Late.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: upserted, error: upsertError } = await supabase
      .from("attendance")
      .upsert(
        roster.map((r) => ({
          student_id: r.studentId,
          subject_id: assignment.subjectId,
          faculty_id: user!.id,
          date,
          status: r.status,
        })),
        { onConflict: "student_id,subject_id,date" },
      )
      .select("id, student_id");

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    const lateRows = roster.filter((r) => r.status === "LATE");
    const attendanceIdByStudent = new Map((upserted ?? []).map((u) => [u.student_id, u.id]));
    const lateAttendanceIds = lateRows
      .map((r) => attendanceIdByStudent.get(r.studentId))
      .filter((id): id is string => !!id);

    if (lateAttendanceIds.length > 0) {
      await supabase.from("late_logs").delete().in("attendance_id", lateAttendanceIds);
      await supabase.from("late_logs").insert(
        lateRows.map((r) => ({
          attendance_id: attendanceIdByStudent.get(r.studentId),
          reason: r.lateReason,
          faculty_id: user!.id,
        })),
      );
    }

    setSaving(false);
    setMessage("Attendance saved.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Class</label>
            <select
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.subjectName} · Section {a.section}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      <Card title="Roster">
        {loading ? (
          <p className="text-sm text-slate-400">Loading roster...</p>
        ) : roster.length === 0 ? (
          <EmptyState message="No students enrolled in this class yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">Roll No</th>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Late reason</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.studentId} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{r.rollNumber}</td>
                    <td className="py-2 pr-4">{r.fullName}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-1">
                        {(["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(r.studentId, s)}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${
                              r.status === s
                                ? s === "PRESENT"
                                  ? "bg-green-600 text-white"
                                  : s === "ABSENT"
                                    ? "bg-red-600 text-white"
                                    : "bg-amber-500 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2">
                      {r.status === "LATE" && (
                        <select
                          value={r.lateReason}
                          onChange={(e) => setLateReason(r.studentId, e.target.value)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="">Select reason</option>
                          {LATE_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save attendance"}
              </button>
              {message && <p className="text-sm text-green-600">{message}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
