import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client. Uses the service-role key so it can bypass RLS
 * when called from a server function. Never import this from a client component.
 *
 * Both env vars are server-only — they MUST be set in the Lovable project's
 * environment (not exposed via VITE_ prefix).
 */
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas env vars do projeto."
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
