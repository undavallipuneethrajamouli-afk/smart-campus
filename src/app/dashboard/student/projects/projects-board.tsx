"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/card";
import type { ProjectPost, TutoringPost, TutoringType } from "@/types/db";

export function ProjectsBoard({
  currentUserId,
  projects,
  tutoring,
  nameById,
}: {
  currentUserId: string;
  projects: ProjectPost[];
  tutoring: TutoringPost[];
  nameById: Record<string, string>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"PROJECTS" | "TUTORING">("PROJECTS");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [tutorType, setTutorType] = useState<TutoringType>("OFFER");
  const [subject, setSubject] = useState("");
  const [tutorDesc, setTutorDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function postProject(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("projects").insert({
      title,
      description,
      skills_needed: skills || null,
      posted_by: currentUserId,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setTitle("");
    setDescription("");
    setSkills("");
    router.refresh();
  }

  async function closeProject(id: string) {
    const supabase = createClient();
    await supabase.from("projects").update({ status: "CLOSED" }).eq("id", id);
    router.refresh();
  }

  async function postTutoring(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("tutoring").insert({
      type: tutorType,
      subject,
      description: tutorDesc || null,
      posted_by: currentUserId,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSubject("");
    setTutorDesc("");
    router.refresh();
  }

  async function removeTutoring(id: string) {
    const supabase = createClient();
    await supabase.from("tutoring").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Projects & Tutoring</h1>
        <p className="text-sm text-slate-500">Find teammates, or request/offer tutoring.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("PROJECTS")}
          className={`px-4 py-2 text-sm font-medium ${tab === "PROJECTS" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"}`}
        >
          Projects
        </button>
        <button
          onClick={() => setTab("TUTORING")}
          className={`px-4 py-2 text-sm font-medium ${tab === "TUTORING" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"}`}
        >
          Tutoring
        </button>
      </div>

      {tab === "PROJECTS" ? (
        <>
          <Card title="Post a project">
            <form onSubmit={postProject} className="space-y-3">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project title"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you building? What help do you need?"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Skills needed (e.g. React, Figma)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Posting..." : "Post project"}
              </button>
            </form>
          </Card>

          <Card title="Open projects">
            {projects.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <li key={p.id} className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-800">
                          {p.title}{" "}
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            {p.status}
                          </span>
                        </p>
                        <p className="text-sm text-slate-600">{p.description}</p>
                        {p.skills_needed && (
                          <p className="mt-1 text-xs text-slate-500">Needs: {p.skills_needed}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          by {nameById[p.posted_by] ?? "Unknown"}
                        </p>
                      </div>
                      {p.posted_by === currentUserId && p.status === "OPEN" && (
                        <button
                          onClick={() => closeProject(p.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No projects posted yet." />
            )}
          </Card>
        </>
      ) : (
        <>
          <Card title="Post a tutoring request or offer">
            <form onSubmit={postTutoring} className="space-y-3">
              <div className="flex gap-3">
                <select
                  value={tutorType}
                  onChange={(e) => setTutorType(e.target.value as TutoringType)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="OFFER">I can tutor</option>
                  <option value="REQUEST">I need tutoring</option>
                </select>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={tutorDesc}
                onChange={(e) => setTutorDesc(e.target.value)}
                placeholder="Details (optional)"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </form>
          </Card>

          <Card title="Tutoring board">
            {tutoring.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {tutoring.map((t) => (
                  <li key={t.id} className="flex items-start justify-between py-3">
                    <div>
                      <p className="font-medium text-slate-800">
                        {t.subject}{" "}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${t.type === "OFFER" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {t.type === "OFFER" ? "Offering" : "Requesting"}
                        </span>
                      </p>
                      {t.description && <p className="text-sm text-slate-600">{t.description}</p>}
                      <p className="mt-1 text-xs text-slate-400">
                        by {nameById[t.posted_by] ?? "Unknown"}
                      </p>
                    </div>
                    {t.posted_by === currentUserId && (
                      <button
                        onClick={() => removeTutoring(t.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No tutoring posts yet." />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
