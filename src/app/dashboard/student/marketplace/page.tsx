import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MarketplaceBoard } from "@/components/marketplace-board";
import type { MarketplaceListing } from "@/types/db";

export default async function MarketplacePage() {
  const profile = await requireRole(["STUDENT"]);
  const supabase = await createClient();

  const [{ data: listings }, { data: profiles }] = await Promise.all([
    supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <MarketplaceBoard
      currentUserId={profile.id}
      listings={(listings as MarketplaceListing[]) ?? []}
      nameById={nameById}
    />
  );
}
