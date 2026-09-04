import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LostFoundBoard, type LostFoundItem } from "@/components/lost-found-board";

export default async function FacultyLostFoundPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("lost_found")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  const items: LostFoundItem[] = (data ?? []).map((d) => ({
    ...d,
    reporterName: (d.profiles as unknown as { full_name: string } | null)?.full_name ?? "Someone",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Lost & Found</h1>
        <p className="text-sm text-slate-500">Report or search for lost and found items on campus.</p>
      </div>
      <LostFoundBoard items={items} currentUserId={profile.id} />
    </div>
  );
}
