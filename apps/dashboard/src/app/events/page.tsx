export const dynamic = "force-dynamic";

import { listClients, listProjects, listEvents } from "@tracker/db";
import { getDb } from "@/lib/db";
import { EventForm } from "@/components/event-form";

export default async function EventsPage() {
  const db = getDb();
  const clients = listClients(db);
  const projects = listProjects(db);
  const events = listEvents(db, {});
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Eventos manuais</h2>
      <EventForm clients={clients} projects={projects} />
      <ul className="space-y-2">
        {events.slice(0, 50).map((e) => (
          <li key={e.id} className="card p-3 text-sm flex justify-between">
            <div>
              <p className="font-semibold">{e.title}</p>
              <p className="text-text-muted text-xs">{e.kind} • {new Date(e.startAt).toLocaleString()} • {e.durationMinutes}min</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
