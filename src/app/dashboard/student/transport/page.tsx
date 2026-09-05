import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function StudentTransportPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("transport_assignments")
    .select("transport_routes(id, name, bus_number, stops, active, profiles(full_name))")
    .eq("student_id", profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Transport</h1>
        <p className="text-sm text-slate-500">
          Simulated route information — not live GPS tracking.
        </p>
      </div>

      {assignments && assignments.length > 0 ? (
        assignments.map((a, i) => {
          const route = a.transport_routes as unknown as {
            id: string;
            name: string;
            bus_number: string;
            stops: string | null;
            active: boolean;
            profiles: { full_name: string } | null;
          } | null;
          if (!route) return null;
          return (
            <Card key={i} title={route.name}>
              <p className="text-sm text-slate-700">Bus number: {route.bus_number}</p>
              <p className="text-sm text-slate-700">Driver: {route.profiles?.full_name ?? "TBA"}</p>
              {route.stops && <p className="text-sm text-slate-700">Stops: {route.stops}</p>}
              <p
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  route.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {route.active ? "Active" : "Inactive"}
              </p>
            </Card>
          );
        })
      ) : (
        <Card>
          <EmptyState message="You are not assigned to a transport route yet." />
        </Card>
      )}
    </div>
  );
}
