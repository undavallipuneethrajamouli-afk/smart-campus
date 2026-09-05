"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/card";

export function PollVoter({
  pollId,
  question,
  options,
  counts,
  myVote,
}: {
  pollId: string;
  question: string;
  options: string[];
  counts: number[];
  myVote: number | null;
}) {
  const router = useRouter();
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = counts.reduce((s, c) => s + (c ?? 0), 0);
  const voted = myVote !== null;

  async function vote(optionIndex: number) {
    setVoting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("poll_responses").insert({
      poll_id: pollId,
      student_id: user!.id,
      option_index: optionIndex,
    });

    setVoting(false);
    if (error) {
      setError("You may have already voted on this poll.");
      return;
    }
    router.refresh();
  }

  return (
    <Card title={question}>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const count = counts[i] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={i}>
              {voted ? (
                <div className="text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span className={myVote === i ? "font-medium text-brand-700" : ""}>
                      {opt} {myVote === i && "✓"}
                    </span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => vote(i)}
                  disabled={voting}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {opt}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
