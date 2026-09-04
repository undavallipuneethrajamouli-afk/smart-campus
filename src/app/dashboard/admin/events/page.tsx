import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { EventForm, AnnouncementForm } from "./forms";

export default async function AdminEventsPage() {
  await requireRole(["ADMIN", "HOD"]);
  const supabase = await createClient();

  const [{ data: events }, { data: announcements }] = await Promise.all([
    supabase.from("events").select("*").order("event_date", { ascending: false }),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Events & News</h1>
        <p className="text-sm text-slate-500">Create events and announcements for the campus feed.</p>
      </div>

      <Card title="Create event">
        <EventForm />
      </Card>

      <Card title="Create announcement">
        <AnnouncementForm />
      </Card>

      <Card title="Upcoming & recent events">
        {events && events.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {events.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <span className="font-medium text-slate-800">{e.title}</span>{" "}
                <span className="text-slate-500">
                  · {e.event_date}
                  {e.event_time ? ` ${e.event_time}` : ""} · {e.location ?? "TBA"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No events yet." />
        )}
      </Card>

      <Card title="Announcements">
        {announcements && announcements.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {announcements.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="font-medium text-slate-800">{a.title}</span>{" "}
                <span className="text-slate-500">· {a.category}</span>
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
