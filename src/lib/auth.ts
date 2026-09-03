import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/types/db";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

/** Redirects to /login if not authenticated, or to their own dashboard if role doesn't match. */
export async function requireRole(allowed: AppRole[]) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");

  if (!allowed.includes(profile.role)) {
    redirect(dashboardPathForRole(profile.role));
  }

  return profile;
}

export function dashboardPathForRole(role: AppRole): string {
  switch (role) {
    case "STUDENT":
      return "/dashboard/student";
    case "FACULTY":
      return "/dashboard/faculty";
    case "HOD":
      return "/dashboard/hod";
    case "ADMIN":
      return "/dashboard/admin";
    case "BUS_DRIVER":
      return "/dashboard/driver";
    case "CANTEEN_STAFF":
      return "/dashboard/canteen";
    case "ALUMNI":
      return "/dashboard/alumni";
    default:
      return "/login";
  }
}
