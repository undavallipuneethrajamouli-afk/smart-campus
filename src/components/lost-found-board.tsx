"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/card";
import type { LostFoundStatus, LostFoundType } from "@/types/db";

export interface LostFoundItem {
  id: string;
  type: LostFoundType;
  title: string;
  description: string | null;
  location: string | null;
  item_date: string | null;
  image_path: string | null;
  status: LostFoundStatus;
  reported_by: string;
  reporterName: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function imageUrl(path: string | null) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/lost-found/${path}`;
}

export function LostFoundBoard({
  items,
  currentUserId,
}: {
  items: LostFoundItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | LostFoundType>("ALL");
  const [search, setSearch] = useState("");

  const [type, setType] = useState<LostFoundType>("LOST");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = items.filter((item) => {
    if (filter !== "ALL" && item.type !== filter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let imagePath: string | null = null;
    if (file) {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("lost-found").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }
      imagePath = path;
    }

    const { error: insertError } = await supabase.from("lost_found").insert({
      type,
      title,
      description: description || null,
      location: location || null,
      item_date: itemDate || null,
      image_path: imagePath,
      reported_by: user!.id,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setDescription("");
    setLocation("");
    setItemDate("");
    setFile(null);
    router.refresh();
  }

  async function markResolved(id: string) {
    const supabase = createClient();
    await supabase.from("lost_found").update({ status: "RESOLVED" }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card title="Report an item">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LostFoundType)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {loading ? "Reporting..." : "Report item"}
          </button>
        </form>
      </Card>

      <Card title="Listings">
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "ALL" | LostFoundType)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="LOST">Lost</option>
            <option value="FOUND">Found</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                {imageUrl(item.image_path) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(item.image_path)!}
                    alt={item.title}
                    className="mb-2 h-32 w-full rounded-md object-cover"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.type === "LOST"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.type}
                  </span>
                  {item.status === "RESOLVED" && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      RESOLVED
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">{item.title}</p>
                {item.description && <p className="text-sm text-slate-600">{item.description}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {item.location ?? "Unknown location"}
                  {item.item_date ? ` · ${item.item_date}` : ""} · by {item.reporterName}
                </p>
                {item.reported_by === currentUserId && item.status !== "RESOLVED" && (
                  <button
                    onClick={() => markResolved(item.id)}
                    className="mt-2 text-xs font-medium text-slate-900 hover:underline"
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No items match your filters." />
        )}
      </Card>
    </div>
  );
}
