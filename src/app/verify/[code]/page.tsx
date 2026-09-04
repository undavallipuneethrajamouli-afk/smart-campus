import { createAdminClient } from "@/lib/supabase/admin";

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: qr } = await admin
    .from("qr_identities")
    .select("profile_id, profiles(full_name, role)")
    .eq("code", code)
    .single();

  if (!qr) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-red-600">Invalid QR code</p>
          <p className="mt-1 text-sm text-slate-500">This code does not match any Smart Campus ID.</p>
        </div>
      </main>
    );
  }

  const profile = qr.profiles as unknown as { full_name: string; role: string };

  let studentInfo: { roll_number: string; year: number; section: string; deptName: string } | null =
    null;
  if (profile.role === "STUDENT") {
    const { data: student } = await admin
      .from("students")
      .select("roll_number, year, section, departments(name)")
      .eq("id", qr.profile_id)
      .single();
    if (student) {
      studentInfo = {
        roll_number: student.roll_number,
        year: student.year,
        section: student.section,
        deptName: (student.departments as unknown as { name: string } | null)?.name ?? "",
      };
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-green-700">✓ Verified Smart Campus ID</p>
        <p className="mt-4 text-xl font-semibold text-slate-900">{profile.full_name}</p>
        <p className="text-sm text-slate-500">{profile.role.replace("_", " ")}</p>
        {studentInfo && (
          <p className="mt-2 text-sm text-slate-500">
            {studentInfo.deptName} · Year {studentInfo.year} · Section {studentInfo.section} · Roll{" "}
            {studentInfo.roll_number}
          </p>
        )}
      </div>
    </main>
  );
}
