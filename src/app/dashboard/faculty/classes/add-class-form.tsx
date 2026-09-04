"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentAcademicYear } from "@/lib/academic-year";
import type { Subject } from "@/types/db";

export function AddClassForm({ subjects }: { subjects: Pick<Subject, "id" | "name" | "code">[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [section, setSection] = useState("A");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subjectId) {
      setError("No subjects available for your department.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("faculty_subjects").insert({
      faculty_id: user!.id,
      subject_id: subjectId,
      section: section.toUpperCase(),
      academic_year: currentAcademicYear(),
    });

    setLoading(false);

    if (error) {
      setError(error.code === "23505" ? "You're already assigned to that class." : error.message);
      return;
    }

    router.refresh();
  }

  if (subjects.length === 0) {
    return <p className="text-sm text-slate-400">No subjects found for your department yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Subject</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Section</label>
        <input
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="mt-1 w-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add class"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
