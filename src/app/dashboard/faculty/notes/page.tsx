import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { UploadNoteForm } from "./upload-note-form";

export default async function FacultyNotesPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("faculty_subjects")
    .select("subject_id, section, academic_year, subjects(name)")
    .eq("faculty_id", profile.id);

  const { data: notes } = await supabase
    .from("notes")
    .select("id, topic, unit, section, academic_year, file_name, created_at, subjects(name)")
    .eq("faculty_id", profile.id)
    .order("created_at", { ascending: false });

  const subjectOptions = Array.from(
    new Map(
      (assignments ?? []).map((a) => [
        a.subject_id,
        { id: a.subject_id, name: (a.subjects as unknown as { name: string } | null)?.name ?? "Subject" },
      ]),
    ).values(),
  );

  const sections = Array.from(new Set((assignments ?? []).map((a) => a.section)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Upload Notes</h1>
        <p className="text-sm text-slate-500">Share notes with students enrolled in your subjects.</p>
      </div>

      {subjectOptions.length > 0 ? (
        <Card title="Upload a note">
          <UploadNoteForm subjects={subjectOptions} sections={sections} />
        </Card>
      ) : (
        <Card>
          <EmptyState message="You have no assigned classes yet. Add one under My Classes." />
        </Card>
      )}

      <Card title="Your uploads">
        {notes && notes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {notes.map((n) => (
              <li key={n.id} className="py-2 text-sm">
                <span className="font-medium text-slate-800">{n.topic}</span>{" "}
                <span className="text-slate-500">
                  · {(n.subjects as unknown as { name: string } | null)?.name} · Section {n.section}{" "}
                  · {n.file_name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="You haven't uploaded any notes yet." />
        )}
      </Card>
    </div>
  );
}
