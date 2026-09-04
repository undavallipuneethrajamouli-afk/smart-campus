import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function StudentFeesPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: fees } = await supabase
    .from("fees")
    .select("id, fee_type, amount, due_date, fee_transactions(amount_paid)")
    .eq("student_id", profile.id)
    .order("due_date");

  const rows = (fees ?? []).map((f) => {
    const paid = (f.fee_transactions ?? []).reduce((s, t) => s + Number(t.amount_paid), 0);
    const amount = Number(f.amount);
    const status = paid >= amount ? "PAID" : new Date(f.due_date) < new Date() ? "OVERDUE" : "PENDING";
    return { ...f, paid, amount, status };
  });

  const totalDue = rows.reduce((s, r) => s + Math.max(r.amount - r.paid, 0), 0);
  const noDues = rows.length > 0 && rows.every((r) => r.status === "PAID");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Fees</h1>
        <p className="text-sm text-slate-500">
          {rows.length > 0
            ? `Total pending: ₹${totalDue.toLocaleString()}`
            : "No fees have been assigned yet."}
        </p>
      </div>

      {noDues && (
        <Card>
          <p className="text-sm font-medium text-green-700">✓ No Dues — all fees are paid.</p>
        </Card>
      )}

      <Card title="Fee details">
        {rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Paid / Amount</th>
                <th className="py-2 pr-4">Due date</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{r.fee_type}</td>
                  <td className="py-2 pr-4">
                    ₹{r.paid.toLocaleString()} / ₹{r.amount.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">{r.due_date}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : r.status === "OVERDUE"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No fees assigned yet." />
        )}
      </Card>
    </div>
  );
}
