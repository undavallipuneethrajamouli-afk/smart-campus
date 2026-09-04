import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS on `notes` already restricts this to enrolled students or staff —
  // if the row comes back, the caller is authorized to download it.
  const { data: note } = await supabase
    .from("notes")
    .select("file_path, file_name")
    .eq("id", id)
    .single();

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("notes")
    .createSignedUrl(note.file_path, 60, { download: note.file_name });

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
