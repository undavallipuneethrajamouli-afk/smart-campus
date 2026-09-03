import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  if (body.role === "STUDENT") {
    const { departmentId, rollNumber, year, section, admissionYear } = body;
    if (!departmentId || !rollNumber || !year || !section || !admissionYear) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase.from("students").insert({
      id: user.id,
      department_id: departmentId,
      roll_number: rollNumber,
      year,
      section,
      admission_year: admissionYear,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else if (body.role === "FACULTY") {
    const { departmentId } = body;
    if (!departmentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase.from("faculty").insert({
      id: user.id,
      department_id: departmentId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
