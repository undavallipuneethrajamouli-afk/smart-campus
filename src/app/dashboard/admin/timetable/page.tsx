import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/card";
import { TimetableManager } from "./timetable-manager";

export default async function AdminTimetablePage() {
  await requireRole(["ADMIN", "HOD"]);
  const supabase = await createClient();

  const { data: departments } = await supabase.from("departments").select("id, name").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Timetable</h1>
        <p className="text-sm text-slate-500">Manage class schedules by department and section.</p>
      </div>

      {departments && departments.length > 0 ? (
        <TimetableManager departments={departments} />
      ) : (
        <Card>
          <p className="text-sm text-slate-400">No departments found.</p>
        </Card>
      )}
    </div>
  );
}
