import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";

export default async function DashboardIndex() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(dashboardPathForRole(profile.role));
}
