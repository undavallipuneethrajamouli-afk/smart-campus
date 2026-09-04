import QRCode from "qrcode";
import { headers } from "next/headers";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/card";

export default async function StudentIdPage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("roll_number, year, section, departments(name)")
    .eq("id", profile.id)
    .single();

  const { data: qr } = await supabase
    .from("qr_identities")
    .select("code")
    .eq("profile_id", profile.id)
    .single();

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const verifyUrl = qr ? `${protocol}://${host}/verify/${qr.code}` : null;
  const qrDataUrl = verifyUrl ? await QRCode.toDataURL(verifyUrl, { width: 240 }) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Digital ID</h1>
        <p className="text-sm text-slate-500">Show this QR code for identity or event verification.</p>
      </div>

      <Card className="max-w-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Verification QR code" width={240} height={240} />
          ) : (
            <p className="text-sm text-slate-400">QR code unavailable.</p>
          )}
          <div>
            <p className="text-lg font-semibold text-slate-900">{profile.full_name}</p>
            <p className="text-sm text-slate-500">
              {(student?.departments as unknown as { name: string } | null)?.name}
            </p>
            <p className="text-sm text-slate-500">
              Year {student?.year} · Section {student?.section} · Roll {student?.roll_number}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
