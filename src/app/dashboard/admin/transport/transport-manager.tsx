"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/card";
import type { TransportRoute } from "@/types/db";

export function TransportManager({
  routes,
  drivers,
  students,
  assignments,
}: {
  routes: TransportRoute[];
  drivers: { id: string; full_name: string }[];
  students: { id: string; label: string }[];
  assignments: { student_id: string; route_id: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [stops, setStops] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [assignRouteId, setAssignRouteId] = useState(routes[0]?.id ?? "");
  const [assignStudentId, setAssignStudentId] = useState(students[0]?.id ?? "");

  // routes/drivers arrive as server props and change after router.refresh()
  // (e.g. right after adding the first route) — useState's initial value
  // only applies at mount. Re-sync during render (React's documented
  // pattern for adjusting state from changed props) rather than in an
  // effect, since this was previously a silent no-op bug: an empty
  // assignRouteId failed the guard clause in handleAssign with no visible
  // error, even though the dropdown appeared to show a selection.
  const [prevRoutes, setPrevRoutes] = useState(routes);
  if (routes !== prevRoutes) {
    setPrevRoutes(routes);
    if (!routes.find((r) => r.id === assignRouteId)) {
      setAssignRouteId(routes[0]?.id ?? "");
    }
  }

  const [prevDrivers, setPrevDrivers] = useState(drivers);
  if (drivers !== prevDrivers) {
    setPrevDrivers(drivers);
    if (!drivers.find((d) => d.id === driverId)) {
      setDriverId(drivers[0]?.id ?? "");
    }
  }

  async function handleAddRoute() {
    if (!name || !busNumber) {
      setError("Enter a route name and bus number.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("transport_routes").insert({
      name,
      bus_number: busNumber,
      driver_id: driverId || null,
      stops: stops || null,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setName("");
    setBusNumber("");
    setStops("");
    router.refresh();
  }

  async function handleAssign() {
    if (!assignRouteId || !assignStudentId) {
      setError("Select a route and a student first.");
      return;
    }
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("transport_assignments").insert({
      student_id: assignStudentId,
      route_id: assignRouteId,
    });
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card title="Add a route">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Route name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Route 4 - City Center"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Bus number</label>
            <input
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Driver</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Stops (optional)</label>
            <input
              value={stops}
              onChange={(e) => setStops(e.target.value)}
              placeholder="Stop A, Stop B, Stop C"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleAddRoute}
          disabled={loading}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add route"}
        </button>
      </Card>

      <Card title="Assign a student to a route">
        <div className="flex flex-wrap items-end gap-3">
          <select
            value={assignRouteId}
            onChange={(e) => setAssignRouteId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.bus_number}
              </option>
            ))}
          </select>
          <select
            value={assignStudentId}
            onChange={(e) => setAssignStudentId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Assign
          </button>
        </div>
      </Card>

      <Card title="Routes">
        {routes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {routes.map((r) => {
              const count = assignments.filter((a) => a.route_id === r.id).length;
              const driver = drivers.find((d) => d.id === r.driver_id);
              return (
                <li key={r.id} className="py-2 text-sm">
                  <span className="font-medium text-slate-800">{r.name}</span>{" "}
                  <span className="text-slate-500">
                    · Bus {r.bus_number} · Driver: {driver?.full_name ?? "Unassigned"} ·{" "}
                    {count} student{count === 1 ? "" : "s"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="No routes created yet." />
        )}
      </Card>
    </div>
  );
}
