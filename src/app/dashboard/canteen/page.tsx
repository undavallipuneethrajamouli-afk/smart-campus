import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function CanteenDashboard() {
  const profile = await requireRole(["CANTEEN_STAFF"]);
  const supabase = await createClient();

  const { data: pendingOrders } = await supabase
    .from("canteen_orders")
    .select("id, status, total_amount, pickup_code, created_at, students(roll_number, profiles(full_name))")
    .in("status", ["PLACED", "PREPARING", "READY"])
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">Canteen staff dashboard</p>
      </div>

      <Card title={`Incoming orders (${pendingOrders?.length ?? 0})`}>
        {pendingOrders && pendingOrders.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {pendingOrders.map((o) => (
              <li key={o.id} className="flex justify-between py-2 text-sm">
                <span className="text-slate-800">
                  {(o.students as unknown as { profiles: { full_name: string } | null } | null)
                    ?.profiles?.full_name ?? "Student"}{" "}
                  · ₹{Number(o.total_amount).toLocaleString()}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {o.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No pending orders right now." />
        )}
        <Link
          href="/dashboard/canteen/orders"
          className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline"
        >
          Manage all orders →
        </Link>
      </Card>
    </div>
  );
}
