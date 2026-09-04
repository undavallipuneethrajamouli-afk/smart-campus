import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentAcademicYear } from "@/lib/academic-year";

// Only these roles may be created through public self-signup. ADMIN, HOD,
// BUS_DRIVER, and CANTEEN_STAFF accounts are created out-of-band (e.g. by
// an existing admin promoting a row directly) — never accept them here,
// regardless of what a client sends.
const SELF_SIGNUP_ROLES = new Set(["STUDENT", "FACULTY", "ALUMNI"]);

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, fullName, role } = body;

  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!SELF_SIGNUP_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
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

    // MVP simplification: enroll into every subject offered by the
    // student's department rather than requiring a separate course
    // registration flow.
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id")
      .eq("department_id", departmentId);

    if (subjects && subjects.length > 0) {
      await supabase.from("enrollments").insert(
        subjects.map((s) => ({
          student_id: data.session!.user.id,
          subject_id: s.id,
          academic_year: currentAcademicYear(),
        })),
      );
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
