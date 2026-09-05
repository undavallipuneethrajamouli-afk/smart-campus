"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/card";
import type { MarketplaceListing } from "@/types/db";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function imageUrl(path: string | null) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/marketplace/${path}`;
}

export function MarketplaceBoard({
  currentUserId,
  listings,
  nameById,
}: {
  currentUserId: string;
  listings: MarketplaceListing[];
  nameById: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const categories = Array.from(new Set(listings.map((l) => l.category)));
  const filtered = listings.filter(
    (l) => categoryFilter === "ALL" || l.category === categoryFilter,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let imagePath: string | null = null;
    if (file) {
      const path = `${currentUserId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("marketplace").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }
      imagePath = path;
    }

    const { error } = await supabase.from("marketplace_listings").insert({
      title,
      description: description || null,
      price: Number(price),
      category,
      condition: condition || null,
      image_path: imagePath,
      seller_id: currentUserId,
    });

    setLoading(false);
    if (error) return setError(error.message);
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("");
    setCondition("");
    setFile(null);
    router.refresh();
  }

  async function markSold(id: string) {
    const supabase = createClient();
    await supabase.from("marketplace_listings").update({ status: "SOLD" }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Campus Marketplace</h1>
        <p className="text-sm text-slate-500">Buy and sell with fellow students.</p>
      </div>

      <Card title="List an item">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Price (₹)</label>
            <input
              required
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <input
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Textbooks, Electronics..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Condition</label>
            <input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="New, Used - good..."
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
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {loading ? "Listing..." : "List item"}
          </button>
        </form>
      </Card>

      <Card title="Listings">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="mb-4 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="flex items-start justify-between">
                  <p className="font-medium text-slate-800">{item.title}</p>
                  {item.status === "SOLD" && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      SOLD
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-brand-700">
                  ₹{Number(item.price).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">
                  {item.category} {item.condition ? `· ${item.condition}` : ""}
                </p>
                {item.description && (
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Seller: {nameById[item.seller_id] ?? "Unknown"}
                </p>
                {item.seller_id === currentUserId && item.status === "AVAILABLE" && (
                  <button
                    onClick={() => markSold(item.id)}
                    className="mt-2 text-xs text-red-600 hover:underline"
                  >
                    Mark sold
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No listings yet." />
        )}
      </Card>
    </div>
  );
}
