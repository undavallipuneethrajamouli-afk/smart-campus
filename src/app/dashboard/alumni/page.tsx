import { requireRole } from "@/lib/auth";
import { Card, EmptyState } from "@/components/card";

export default async function AlumniDashboard() {
  const profile = await requireRole(["ALUMNI"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile.full_name}</h1>
        <p className="text-sm text-slate-500">Alumni dashboard</p>
      </div>
      <Card title="Community">
        <EmptyState message="Alumni features are not set up yet." />
      </Card>
    </div>
  );
}
