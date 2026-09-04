import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function StudentNotesPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("subject_id")
    .eq("student_id", profile.id);

  const subjectIds = (enrollments ?? []).map((e) => e.subject_id);

  const { data: notes } = subjectIds.length
    ? await supabase
        .from("notes")
        .select("id, topic, unit, section, file_name, created_at, subjects(name)")
        .in("subject_id", subjectIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Notes</h1>
        <p className="text-sm text-slate-500">Notes shared by faculty for your subjects.</p>
      </div>

      <Card title="Available notes">
        {notes && notes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {notes.map((n) => (
              <li key={n.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{n.topic}</p>
                  <p className="text-slate-500">
                    {(n.subjects as unknown as { name: string } | null)?.name}
                    {n.unit ? ` · ${n.unit}` : ""} · Section {n.section}
                  </p>
                </div>
                <a
                  href={`/api/notes/${n.id}/download`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No notes have been shared for your subjects yet." />
        )}
      </Card>
    </div>
  );
}
