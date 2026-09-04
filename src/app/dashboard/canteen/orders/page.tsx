import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { OrderRow, PickupVerifier } from "./orders-client";

export default async function CanteenOrdersPage() {
  await requireRole(["CANTEEN_STAFF", "ADMIN"]);
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("canteen_orders")
    .select("id, status, total_amount, pickup_code, created_at, students(roll_number, profiles(full_name))")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Canteen Orders</h1>
        <p className="text-sm text-slate-500">Update order status and verify pickups.</p>
      </div>

      <Card title="Verify pickup code">
        <PickupVerifier />
      </Card>

      <Card title="Recent orders">
        {orders && orders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Code</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={{
                    id: o.id,
                    status: o.status,
                    total_amount: Number(o.total_amount),
                    pickup_code: o.pickup_code,
                    studentName:
                      (o.students as unknown as { profiles: { full_name: string } | null } | null)
                        ?.profiles?.full_name ?? "Student",
                    rollNumber:
                      (o.students as unknown as { roll_number: string } | null)?.roll_number ?? "",
                  }}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No orders yet." />
        )}
      </Card>
    </div>
  );
}
