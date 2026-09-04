"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentAcademicYear } from "@/lib/academic-year";

interface SubjectOption {
  id: string;
  name: string;
}

export function UploadNoteForm({
  subjects,
  sections,
}: {
  subjects: SubjectOption[];
  sections: string[];
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [section, setSection] = useState(sections[0] ?? "");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20MB.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = `${subjectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("notes").upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("notes").insert({
      subject_id: subjectId,
      faculty_id: user!.id,
      unit: unit || null,
      topic,
      academic_year: currentAcademicYear(),
      section,
      file_path: path,
      file_name: file.name,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTopic("");
    setUnit("");
    setFile(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Unit (optional)</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Topic</label>
          <input
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">File</label>
        <input
          type="file"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload note"}
      </button>
    </form>
  );
}
