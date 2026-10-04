import { createBrowserClient } from "@supabase/ssr";

/**
 * Tarayıcı (Client Component) için Supabase istemcisi.
 * Anon key kullanır; oturum çerezlerini otomatik yönetir.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
