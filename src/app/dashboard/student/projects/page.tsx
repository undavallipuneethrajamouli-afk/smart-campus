import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectsBoard } from "./projects-board";
import type { ProjectPost, TutoringPost } from "@/types/db";

export default async function ProjectsAndTutoringPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const [{ data: projects }, { data: tutoring }, { data: profiles }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("tutoring").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <ProjectsBoard
      currentUserId={profile.id}
      projects={(projects as ProjectPost[]) ?? []}
      tutoring={(tutoring as TutoringPost[]) ?? []}
      nameById={Object.fromEntries(nameById)}
    />
  );
}
