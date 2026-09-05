import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { CreatePollForm } from "./create-poll-form";

export default async function AdminPollsPage() {
  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data: polls } = await supabase
    .from("polls")
    .select("id, question, options, active, created_at")
    .order("created_at", { ascending: false });

  const { data: responses } = await supabase.from("poll_responses").select("poll_id, option_index");

  const countsByPoll = new Map<string, number[]>();
  for (const r of responses ?? []) {
    const arr = countsByPoll.get(r.poll_id) ?? [];
    arr[r.option_index] = (arr[r.option_index] ?? 0) + 1;
    countsByPoll.set(r.poll_id, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Polls</h1>
        <p className="text-sm text-slate-500">Create a poll and view live results.</p>
      </div>

      <CreatePollForm />

      <Card title="All polls">
        {polls && polls.length > 0 ? (
          <div className="space-y-4">
            {polls.map((p) => {
              const options = p.options as string[];
              const counts = countsByPoll.get(p.id) ?? [];
              const total = counts.reduce((s, c) => s + (c ?? 0), 0);
              return (
                <div key={p.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <p className="font-medium text-slate-800">{p.question}</p>
                  <div className="mt-2 space-y-1">
                    {options.map((opt, i) => {
                      const count = counts[i] ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={i} className="text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>{opt}</span>
                            <span>
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-brand-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No polls created yet." />
        )}
      </Card>
    </div>
  );
}
