import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    _supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return _supabase;
}

/** @deprecated Use getSupabase() instead */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string) {
    const client = getSupabase();
    return client[prop as keyof SupabaseClient];
  },
});
