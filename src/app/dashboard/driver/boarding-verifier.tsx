"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/card";

export function BoardingVerifier({ routes }: { routes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { data: qr } = await supabase
      .from("qr_identities")
      .select("profile_id, profiles(full_name, role)")
      .eq("code", code.trim())
      .single();

    if (!qr) {
      setLoading(false);
      setMessage({ type: "error", text: "No student found for that code." });
      return;
    }

    const profile = qr.profiles as unknown as { full_name: string; role: string } | null;
    if (profile?.role !== "STUDENT") {
      setLoading(false);
      setMessage({ type: "error", text: "This code does not belong to a student." });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("boarding_records").insert({
      student_id: qr.profile_id,
      route_id: routeId,
      verified_by: user!.id,
    });

    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: "Student is not assigned to this route." });
      return;
    }

    setMessage({ type: "success", text: `Boarding verified: ${profile.full_name}` });
    setCode("");
    router.refresh();
  }

  return (
    <Card title="Verify boarding">
      <div className="flex flex-wrap items-end gap-3">
        <select
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter student's QR code"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleVerify}
          disabled={loading}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
