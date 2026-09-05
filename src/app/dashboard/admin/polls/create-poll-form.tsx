"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/card";

export function CreatePollForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateOption(i: number, value: string) {
    setOptions(options.map((o, idx) => (idx === i ? value : o)));
  }

  async function handleSubmit() {
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) {
      setError("Enter a question and at least 2 options.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("polls").insert({
      question: question.trim(),
      options: cleaned,
      created_by: user!.id,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setQuestion("");
    setOptions(["", ""]);
    router.refresh();
  }

  return (
    <Card title="Create a poll">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Poll question"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="mt-3 space-y-2">
        {options.map((o, i) => (
          <input
            key={i}
            value={o}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => setOptions([...options, ""])}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          + Add option
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="ml-auto rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create poll"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
