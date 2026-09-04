"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CanteenOrderStatus } from "@/types/db";

const NEXT_STATUS: Record<CanteenOrderStatus, CanteenOrderStatus | null> = {
  PLACED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
  COMPLETED: null,
};

interface Order {
  id: string;
  status: CanteenOrderStatus;
  total_amount: number;
  pickup_code: string;
  studentName: string;
  rollNumber: string;
}

export function OrderRow({ order }: { order: Order }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const next = NEXT_STATUS[order.status];

  async function advance() {
    if (!next) return;
    setUpdating(true);
    const supabase = createClient();
    await supabase.from("canteen_orders").update({ status: next }).eq("id", order.id);
    setUpdating(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4">
        {order.studentName} · {order.rollNumber}
      </td>
      <td className="py-2 pr-4">₹{order.total_amount.toLocaleString()}</td>
      <td className="py-2 pr-4 font-mono">{order.pickup_code}</td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {order.status}
          </span>
          {next && (
            <button
              onClick={advance}
              disabled={updating}
              className="text-xs font-medium text-slate-900 hover:underline"
            >
              Mark {next}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PickupVerifier() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setError(null);
    setResult(null);
    const supabase = createClient();

    const { data: order } = await supabase
      .from("canteen_orders")
      .select("id, status")
      .eq("pickup_code", code.toUpperCase())
      .single();

    if (!order) {
      setError("No order found with that code.");
      return;
    }
    if (order.status === "COMPLETED") {
      setResult("This order was already picked up.");
      return;
    }
    if (order.status !== "READY") {
      setError(`Order is not ready yet (status: ${order.status}).`);
      return;
    }

    await supabase.from("canteen_orders").update({ status: "COMPLETED" }).eq("id", order.id);
    setResult("Pickup verified — order marked completed.");
    setCode("");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Pickup code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
        />
      </div>
      <button
        onClick={verify}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Verify
      </button>
      {result && <p className="text-sm text-green-600">{result}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
