import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/card";
import { CoinAwardForm } from "./coin-award-form";

export default async function AdminCoinsPage() {
  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, roll_number, profiles(full_name)")
    .order("roll_number");

  const { data: recent } = await supabase
    .from("campus_coin_transactions")
    .select("amount, reason, created_at, students(roll_number, profiles(full_name))")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Campus Coins</h1>
        <p className="text-sm text-slate-500">Award coins for verified student activities.</p>
      </div>

      {students && students.length > 0 ? (
        <CoinAwardForm
          students={students.map((s) => ({
            id: s.id,
            label: `${s.roll_number} · ${(s.profiles as unknown as { full_name: string } | null)?.full_name ?? "Student"}`,
          }))}
        />
      ) : (
        <Card>
          <p className="text-sm text-slate-400">No students found.</p>
        </Card>
      )}

      <Card title="Recent awards">
        {recent && recent.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {recent.map((r, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span className="text-slate-800">
                  {(r.students as unknown as { profiles: { full_name: string } | null } | null)
                    ?.profiles?.full_name}{" "}
                  — {r.reason}
                </span>
                <span className={r.amount >= 0 ? "text-green-600" : "text-red-600"}>
                  {r.amount >= 0 ? "+" : ""}
                  {r.amount}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No coins awarded yet.</p>
        )}
      </Card>
    </div>
  );
}
