import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, fullName, role } = body;

  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  if (!data.session) {
    return NextResponse.json(
      {
        error:
          "Account created. Email confirmation is required — check your inbox before signing in.",
        needsConfirmation: true,
      },
      { status: 200 },
    );
  }

  if (role === "STUDENT") {
    const { departmentId, rollNumber, year, section, admissionYear } = body;
    if (!departmentId || !rollNumber || !year || !section || !admissionYear) {
      return NextResponse.json({ error: "Missing student details" }, { status: 400 });
    }

    const { error } = await supabase.from("students").insert({
      id: data.session.user.id,
      department_id: departmentId,
      roll_number: rollNumber,
      year,
      section,
      admission_year: admissionYear,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else if (role === "FACULTY") {
    const { departmentId } = body;
    if (!departmentId) {
      return NextResponse.json({ error: "Missing faculty details" }, { status: 400 });
    }

    const { error } = await supabase.from("faculty").insert({
      id: data.session.user.id,
      department_id: departmentId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
