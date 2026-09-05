"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/card";
import type { Resume, ResumeAchievement, ResumeProject, ResumeSkill } from "@/types/db";

export function ResumeEditor({
  fullName,
  email,
  department,
  year,
  rollNumber,
  initialResume,
}: {
  fullName: string;
  email: string;
  department: string;
  year: number | undefined;
  rollNumber: string | undefined;
  initialResume: Resume | null;
}) {
  const [headline, setHeadline] = useState(initialResume?.headline ?? "");
  const [summary, setSummary] = useState(initialResume?.summary ?? "");
  const [skills, setSkills] = useState<ResumeSkill[]>(initialResume?.skills ?? []);
  const [projects, setProjects] = useState<ResumeProject[]>(initialResume?.projects ?? []);
  const [achievements, setAchievements] = useState<ResumeAchievement[]>(
    initialResume?.achievements ?? [],
  );
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("resumes").upsert({
      student_id: user!.id,
      headline,
      summary,
      skills,
      projects,
      achievements,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    setMessage(error ? error.message : "Saved.");
  }

  function addSkill() {
    if (!newSkill.trim()) return;
    setSkills([...skills, { name: newSkill.trim() }]);
    setNewSkill("");
  }

  function addProject() {
    setProjects([...projects, { title: "", description: "", link: "" }]);
  }

  function addAchievement() {
    setAchievements([...achievements, { title: "", date: "", description: "" }]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Resume Builder</h1>
          <p className="text-sm text-slate-500">Build your resume, then print or save as PDF.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && <p className="text-sm text-slate-500">{message}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 print:hidden">
          <Card title="Headline & Summary">
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Computer Science student passionate about web development"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short professional summary..."
              rows={3}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Card>

          <Card title="Skills">
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs"
                >
                  {s.name}
                  <button
                    onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add a skill and press Enter"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={addSkill}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Add
              </button>
            </div>
          </Card>

          <Card title="Projects">
            {projects.map((p, i) => (
              <div key={i} className="mb-3 space-y-2 border-b border-slate-100 pb-3 last:border-0">
                <input
                  value={p.title}
                  onChange={(e) =>
                    setProjects(
                      projects.map((pr, idx) => (idx === i ? { ...pr, title: e.target.value } : pr)),
                    )
                  }
                  placeholder="Project title"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={p.description}
                  onChange={(e) =>
                    setProjects(
                      projects.map((pr, idx) =>
                        idx === i ? { ...pr, description: e.target.value } : pr,
                      ),
                    )
                  }
                  placeholder="Description"
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    value={p.link}
                    onChange={(e) =>
                      setProjects(
                        projects.map((pr, idx) => (idx === i ? { ...pr, link: e.target.value } : pr)),
                      )
                    }
                    placeholder="Link (optional)"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => setProjects(projects.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addProject}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              + Add project
            </button>
          </Card>

          <Card title="Achievements">
            {achievements.map((a, i) => (
              <div key={i} className="mb-3 space-y-2 border-b border-slate-100 pb-3 last:border-0">
                <div className="flex gap-2">
                  <input
                    value={a.title}
                    onChange={(e) =>
                      setAchievements(
                        achievements.map((ac, idx) =>
                          idx === i ? { ...ac, title: e.target.value } : ac,
                        ),
                      )
                    }
                    placeholder="Achievement"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={a.date}
                    onChange={(e) =>
                      setAchievements(
                        achievements.map((ac, idx) => (idx === i ? { ...ac, date: e.target.value } : ac)),
                      )
                    }
                    placeholder="Date"
                    className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={a.description}
                    onChange={(e) =>
                      setAchievements(
                        achievements.map((ac, idx) =>
                          idx === i ? { ...ac, description: e.target.value } : ac,
                        ),
                      )
                    }
                    placeholder="Description"
                    rows={2}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => setAchievements(achievements.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addAchievement}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              + Add achievement
            </button>
          </Card>
        </div>

        <div className="print:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
            <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
            <p className="text-sm text-slate-500">
              {email} · {department} {year ? `· Year ${year}` : ""} {rollNumber ? `· Roll ${rollNumber}` : ""}
            </p>
            {headline && <p className="mt-3 text-sm font-medium text-brand-700">{headline}</p>}
            {summary && <p className="mt-2 text-sm text-slate-700">{summary}</p>}

            {skills.length > 0 && (
              <div className="mt-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Skills
                </h2>
                <p className="mt-1 text-sm text-slate-700">{skills.map((s) => s.name).join(" · ")}</p>
              </div>
            )}

            {projects.length > 0 && (
              <div className="mt-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Projects
                </h2>
                <div className="mt-2 space-y-3">
                  {projects.map((p, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-slate-800">
                        {p.title}
                        {p.link && (
                          <span className="ml-2 text-xs font-normal text-brand-600">{p.link}</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-600">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {achievements.length > 0 && (
              <div className="mt-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Achievements
                </h2>
                <div className="mt-2 space-y-2">
                  {achievements.map((a, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-slate-800">
                        {a.title} {a.date && <span className="text-slate-400">· {a.date}</span>}
                      </p>
                      <p className="text-sm text-slate-600">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
