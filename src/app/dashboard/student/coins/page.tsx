import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function StudentCoinsPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("campus_coin_transactions")
    .select("amount, reason, created_at")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  const balance = (transactions ?? []).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Campus Coins</h1>
        <p className="text-sm text-slate-500">Earned for verified activities and achievements.</p>
      </div>

      <Card title="Balance">
        <p className="text-3xl font-bold text-brand-600">{balance}</p>
      </Card>

      <Card title="History">
        {transactions && transactions.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {transactions.map((t, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <div>
                  <p className="text-slate-800">{t.reason}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={t.amount >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>
                  {t.amount >= 0 ? "+" : ""}
                  {t.amount}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No coins earned yet." />
        )}
      </Card>
    </div>
  );
}
