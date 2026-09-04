import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { CanteenOrdering } from "./ordering";

export default async function StudentCanteenPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const [{ data: menu }, { data: orders }] = await Promise.all([
    supabase.from("canteen_menu").select("*").eq("available", true).order("category"),
    supabase
      .from("canteen_orders")
      .select("id, status, total_amount, pickup_code, created_at")
      .eq("student_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Canteen</h1>
        <p className="text-sm text-slate-500">Browse the menu and place an order.</p>
      </div>

      {menu && menu.length > 0 ? (
        <CanteenOrdering menu={menu} />
      ) : (
        <Card>
          <EmptyState message="No menu items available right now." />
        </Card>
      )}

      <Card title="Your recent orders">
        {orders && orders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Placed</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Pickup code</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">₹{Number(o.total_amount).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono">{o.pickup_code}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : o.status === "READY"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="You haven't placed any orders yet." />
        )}
      </Card>
    </div>
  );
}
