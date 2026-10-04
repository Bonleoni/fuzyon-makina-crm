import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic link doğrulama endpoint'i.
 * Supabase'den gelen `code` ile session oluşturur ve dashboard'a yönlendirir.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next") ?? "/admin/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Güvenlik: yalnızca site içi relative path'lere izin ver
      const safeNext = nextPath.startsWith("/") ? nextPath : "/admin/dashboard";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }

    console.error("Auth callback hatası:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=1`);
}
