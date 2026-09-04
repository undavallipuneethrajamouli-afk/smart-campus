"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MenuForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("canteen_menu").insert({
      name,
      category: category || null,
      price: Number(price),
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setCategory("");
    setPrice("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Snacks, Meals..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Price (₹)</label>
        <input
          type="number"
          min="0"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add item"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
    </form>
  );
}

interface MenuItem {
  id: string;
  name: string;
  category: string | null;
  price: number;
  available: boolean;
}

export function MenuItemRow({ item }: { item: MenuItem }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  async function toggleAvailable() {
    setUpdating(true);
    const supabase = createClient();
    await supabase.from("canteen_menu").update({ available: !item.available }).eq("id", item.id);
    setUpdating(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4">{item.name}</td>
      <td className="py-2 pr-4">{item.category ?? "—"}</td>
      <td className="py-2 pr-4">₹{Number(item.price).toLocaleString()}</td>
      <td className="py-2">
        <button
          onClick={toggleAvailable}
          disabled={updating}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.available ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {item.available ? "Available" : "Unavailable"}
        </button>
      </td>
    </tr>
  );
}
