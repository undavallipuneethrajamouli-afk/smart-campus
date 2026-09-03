import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Full-access client using the service_role key. Bypasses Row Level Security.
 * Import ONLY in server-side code (route handlers, server actions) that has
 * already verified the caller's role — never expose this to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
