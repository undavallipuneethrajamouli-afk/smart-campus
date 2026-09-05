import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TransportManager } from "./transport-manager";

export default async function AdminTransportPage() {
  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const [{ data: routes }, { data: drivers }, { data: students }, { data: assignments }] =
    await Promise.all([
      supabase.from("transport_routes").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("role", "BUS_DRIVER"),
      supabase.from("students").select("id, roll_number, profiles(full_name)").order("roll_number"),
      supabase.from("transport_assignments").select("student_id, route_id"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Transport</h1>
        <p className="text-sm text-slate-500">
          Manage bus routes and student assignments. Route/stop info is entered manually — not live
          GPS tracking.
        </p>
      </div>

      <TransportManager
        routes={routes ?? []}
        drivers={drivers ?? []}
        students={(students ?? []).map((s) => ({
          id: s.id,
          label: `${s.roll_number} · ${(s.profiles as unknown as { full_name: string } | null)?.full_name ?? "Student"}`,
        }))}
        assignments={assignments ?? []}
      />
    </div>
  );
}
