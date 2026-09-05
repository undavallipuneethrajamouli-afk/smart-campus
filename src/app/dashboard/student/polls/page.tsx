import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { PollVoter } from "./poll-voter";

export default async function StudentPollsPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: polls } = await supabase
    .from("polls")
    .select("id, question, options, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data: myResponses } = await supabase
    .from("poll_responses")
    .select("poll_id, option_index")
    .eq("student_id", profile.id);

  const { data: allResponses } = await supabase.from("poll_responses").select("poll_id, option_index");

  const countsByPoll = new Map<string, number[]>();
  for (const r of allResponses ?? []) {
    const arr = countsByPoll.get(r.poll_id) ?? [];
    arr[r.option_index] = (arr[r.option_index] ?? 0) + 1;
    countsByPoll.set(r.poll_id, arr);
  }

  const myResponseByPoll = new Map((myResponses ?? []).map((r) => [r.poll_id, r.option_index]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Polls</h1>
        <p className="text-sm text-slate-500">Vote on active campus polls.</p>
      </div>

      {polls && polls.length > 0 ? (
        <div className="space-y-4">
          {polls.map((p) => (
            <PollVoter
              key={p.id}
              pollId={p.id}
              question={p.question}
              options={p.options as string[]}
              counts={countsByPoll.get(p.id) ?? []}
              myVote={myResponseByPoll.get(p.id) ?? null}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState message="No active polls right now." />
        </Card>
      )}
    </div>
  );
}
