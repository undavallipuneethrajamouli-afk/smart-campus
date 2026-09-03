import { requireRole } from "@/lib/auth";
import { Card, EmptyState } from "@/components/card";

export default async function CanteenDashboard() {
  const profile = await requireRole(["CANTEEN_STAFF"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">Canteen staff dashboard</p>
      </div>
      <Card title="Incoming orders">
        <EmptyState message="Canteen module is not set up yet." />
      </Card>
    </div>
  );
}
