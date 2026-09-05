import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { BoardingVerifier } from "./boarding-verifier";

export default async function DriverDashboard() {
  const profile = await requireRole(["BUS_DRIVER"]);
  const supabase = await createClient();

  const { data: routes } = await supabase
    .from("transport_routes")
    .select("id, name, bus_number, stops")
    .eq("driver_id", profile.id);

  const routeIds = (routes ?? []).map((r) => r.id);

  const { data: assignments } = routeIds.length
    ? await supabase
        .from("transport_assignments")
        .select("route_id, students(id, roll_number, profiles(full_name))")
        .in("route_id", routeIds)
    : { data: [] };

  const { data: todaysBoardings } = routeIds.length
    ? await supabase
        .from("boarding_records")
        .select("student_id, boarded_at")
        .in("route_id", routeIds)
        .gte("boarded_at", new Date().toISOString().slice(0, 10))
    : { data: [] };

  const boardedIds = new Set((todaysBoardings ?? []).map((b) => b.student_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">Bus driver dashboard</p>
      </div>

      {routes && routes.length > 0 ? (
        <>
          {routes.map((r) => (
            <Card key={r.id} title={`${r.name} · Bus ${r.bus_number}`}>
              {r.stops && <p className="text-sm text-slate-600">Stops: {r.stops}</p>}
            </Card>
          ))}

          <BoardingVerifier routes={routes.map((r) => ({ id: r.id, name: r.name }))} />

          <Card title="Assigned students">
            {assignments && assignments.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {assignments.map((a, i) => {
                  const student = a.students as unknown as {
                    id: string;
                    roll_number: string;
                    profiles: { full_name: string } | null;
                  } | null;
                  if (!student) return null;
                  return (
                    <li key={i} className="flex justify-between py-2 text-sm">
                      <span className="text-slate-800">
                        {student.roll_number} · {student.profiles?.full_name}
                      </span>
                      {boardedIds.has(student.id) && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Boarded today
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState message="No students assigned to your route(s) yet." />
            )}
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState message="You are not assigned to a route yet. Contact your admin." />
        </Card>
      )}
    </div>
  );
}
