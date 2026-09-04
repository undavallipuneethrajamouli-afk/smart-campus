import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { AttendanceMarker } from "./attendance-marker";

export default async function FacultyAttendancePage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("faculty_subjects")
    .select("id, subject_id, section, academic_year, subjects(name, code)")
    .eq("faculty_id", profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Mark Attendance</h1>
        <p className="text-sm text-slate-500">Select a class and date to take attendance.</p>
      </div>

      {assignments && assignments.length > 0 ? (
        <AttendanceMarker
          assignments={assignments.map((a) => ({
            id: a.id,
            subjectId: a.subject_id,
            section: a.section,
            academicYear: a.academic_year,
            subjectName: (a.subjects as unknown as { name: string } | null)?.name ?? "Subject",
          }))}
        />
      ) : (
        <Card>
          <EmptyState message="You have no assigned classes yet. Add one under My Classes." />
        </Card>
      )}
    </div>
  );
}
