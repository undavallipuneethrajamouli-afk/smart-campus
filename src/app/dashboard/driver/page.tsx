import { requireRole } from "@/lib/auth";
import { Card, EmptyState } from "@/components/card";

export default async function DriverDashboard() {
  const profile = await requireRole(["BUS_DRIVER"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">Bus driver dashboard</p>
      </div>
      <Card title="Assigned route">
        <EmptyState message="Transport module is not set up yet." />
      </Card>
    </div>
  );
}
