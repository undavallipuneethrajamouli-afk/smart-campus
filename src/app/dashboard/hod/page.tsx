import { requireRole } from "@/lib/auth";
import { Card, EmptyState } from "@/components/card";

export default async function HodDashboard() {
  const profile = await requireRole(["HOD"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">HOD dashboard</p>
      </div>
      <Card title="Department analytics">
        <EmptyState message="Department analytics will appear here once attendance and academic data are recorded." />
      </Card>
    </div>
  );
}
