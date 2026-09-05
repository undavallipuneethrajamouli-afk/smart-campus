import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Resume } from "@/types/db";
import { ResumeEditor } from "./resume-editor";

export default async function ResumeBuilderPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("roll_number, year, section, departments(name)")
    .eq("id", profile.id)
    .single();

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("student_id", profile.id)
    .single();

  return (
    <ResumeEditor
      fullName={profile.full_name}
      email={profile.email}
      department={(student?.departments as unknown as { name: string } | null)?.name ?? ""}
      year={student?.year}
      rollNumber={student?.roll_number}
      initialResume={resume as Resume | null}
    />
  );
}
