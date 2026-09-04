import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat-panel";

export default async function FacultyMessagesPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, students(roll_number, profiles(full_name))")
    .eq("faculty_id", profile.id);

  const conversationSummaries = (conversations ?? []).map((c) => {
    const student = c.students as unknown as {
      roll_number: string;
      profiles: { full_name: string } | null;
    } | null;
    return {
      id: c.id,
      otherName: `${student?.profiles?.full_name ?? "Student"} (${student?.roll_number ?? ""})`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500">Conversations started by students.</p>
      </div>
      <ChatPanel conversations={conversationSummaries} meId={profile.id} role="FACULTY" />
    </div>
  );
}
