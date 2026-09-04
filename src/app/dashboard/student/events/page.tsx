import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";

export default async function StudentEventsPage() {
  await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const [{ data: events }, { data: announcements }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .order("event_date"),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Events & News</h1>
        <p className="text-sm text-slate-500">Campus events and announcements.</p>
      </div>

      <Card title="Upcoming events">
        {events && events.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {events.map((e) => (
              <li key={e.id} className="py-3 text-sm">
                <p className="font-medium text-slate-800">{e.title}</p>
                <p className="text-slate-500">
                  {e.event_date}
                  {e.event_time ? ` · ${e.event_time}` : ""} · {e.location ?? "TBA"}
                  {e.organizer ? ` · ${e.organizer}` : ""}
                </p>
                {e.description && <p className="mt-1 text-slate-600">{e.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No upcoming events." />
        )}
      </Card>

      <Card title="Announcements">
        {announcements && announcements.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {announcements.map((a) => (
              <li key={a.id} className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.category === "EXAM"
                        ? "bg-red-100 text-red-700"
                        : a.category === "PLACEMENT"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {a.category}
                  </span>
                  <span className="font-medium text-slate-800">{a.title}</span>
                </div>
                <p className="mt-1 text-slate-600">{a.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No announcements yet." />
        )}
      </Card>
    </div>
  );
}
