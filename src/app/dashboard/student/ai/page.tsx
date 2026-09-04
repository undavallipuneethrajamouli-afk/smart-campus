import { requireRole } from "@/lib/auth";
import { HelpdeskChat } from "./helpdesk-chat";

export default async function StudentAiHelpdeskPage() {
  await requireRole(["STUDENT"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Helpdesk</h1>
        <p className="text-sm text-slate-500">
          Ask general academic questions. This assistant doesn&apos;t yet have access to your
          college&apos;s specific policies or documents — for those, check with your department.
        </p>
      </div>

      <HelpdeskChat />
    </div>
  );
}
