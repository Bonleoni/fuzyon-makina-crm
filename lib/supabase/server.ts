import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Sunucu tarafı (Server Component / Route Handler) için Supabase istemcisi.
 * Kullanıcının oturum çerezlerini okuyup yazabilir.
 */
export async function createClient() {
  // Next.js 14'te cookies() senkron çalışır
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component içinden set edilemezse yoksay;
            // middleware oturumu yenileyecektir.
          }
        },
      },
    }
  );
}
