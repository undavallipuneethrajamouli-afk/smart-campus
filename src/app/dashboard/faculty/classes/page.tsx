import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { AddClassForm } from "./add-class-form";

export default async function FacultyClassesPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: faculty } = await supabase
    .from("faculty")
    .select("department_id")
    .eq("id", profile.id)
    .single();

  const { data: subjects } = faculty?.department_id
    ? await supabase
        .from("subjects")
        .select("id, name, code")
        .eq("department_id", faculty.department_id)
    : { data: [] };

  const { data: assignments } = await supabase
    .from("faculty_subjects")
    .select("id, section, academic_year, subjects(name, code)")
    .eq("faculty_id", profile.id)
    .order("academic_year", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Classes</h1>
        <p className="text-sm text-slate-500">
          Assign yourself to the subjects and sections you teach.
        </p>
      </div>

      <Card title="Add a class">
        <AddClassForm subjects={subjects ?? []} />
      </Card>

      <Card title="Current classes">
        {assignments && assignments.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {assignments.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="font-medium text-slate-800">
                  {(a.subjects as unknown as { name: string; code: string } | null)?.name}
                </span>{" "}
                <span className="text-slate-500">
                  · Section {a.section} · {a.academic_year}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="You haven't added any classes yet." />
        )}
      </Card>
    </div>
  );
}
