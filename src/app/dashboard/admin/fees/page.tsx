import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/card";
import { FeeManager } from "./fee-manager";

export default async function AdminFeesPage() {
  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, roll_number, section, profiles(full_name)")
    .order("roll_number");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Fees</h1>
        <p className="text-sm text-slate-500">Assign fees and record payments.</p>
      </div>

      {students && students.length > 0 ? (
        <FeeManager
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
    </div>
  );
}
