import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat-panel";

export default async function StudentMessagesPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("department_id")
    .eq("id", profile.id)
    .single();

  const [{ data: conversations }, { data: faculty }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, faculty(profiles(full_name))")
      .eq("student_id", profile.id),
    student?.department_id
      ? supabase
          .from("faculty")
          .select("id, profiles(full_name)")
          .eq("department_id", student.department_id)
      : Promise.resolve({ data: [] }),
  ]);

  const conversationSummaries = (conversations ?? []).map((c) => ({
    id: c.id,
    otherName:
      (c.faculty as unknown as { profiles: { full_name: string } | null } | null)?.profiles
        ?.full_name ?? "Faculty",
  }));

  const existingFacultyNames = new Set(conversationSummaries.map((c) => c.otherName));
  const newContacts = (faculty ?? [])
    .map((f) => ({
      id: f.id,
      name: (f.profiles as unknown as { full_name: string } | null)?.full_name ?? "Faculty",
    }))
    .filter((f) => !existingFacultyNames.has(f.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500">Chat with faculty in your department.</p>
      </div>
      <ChatPanel
        conversations={conversationSummaries}
        meId={profile.id}
        role="STUDENT"
        newContacts={newContacts}
      />
    </div>
  );
}
