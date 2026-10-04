import { createClient } from "@/lib/supabase/client";

export type AuthResult = {
  success: boolean;
  errorMessage?: string;
};

/**
 * E-posta ile Magic Link (OTP) gönderir.
 * Başarı/hata bilgisini Türkçe mesajla döner.
 */
export async function signInWithEmail(email: string): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    return {
      success: false,
      errorMessage: "Lütfen geçerli bir e-posta adresi girin.",
    };
  }

  try {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("signInWithEmail hatası:", error.message);
      return {
        success: false,
        errorMessage: mapAuthErrorToTurkish(error.message),
      };
    }

    console.info("Magic link gönderildi:", trimmedEmail);
    return { success: true };
  } catch (error) {
    console.error("signInWithEmail beklenmeyen hata:", error);
    return {
      success: false,
      errorMessage:
        "Giriş linki gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }
}

/**
 * Kullanıcı oturumunu sonlandırır.
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("signOut hatası:", error.message);
      return {
        success: false,
        errorMessage: "Çıkış yapılırken bir hata oluştu.",
      };
    }

    console.info("Kullanıcı oturumu kapatıldı.");
    return { success: true };
  } catch (error) {
    console.error("signOut beklenmeyen hata:", error);
    return {
      success: false,
      errorMessage: "Çıkış yapılırken bir hata oluştu.",
    };
  }
}

/** Supabase hata metinlerini kullanıcı dostu Türkçe mesaja çevirir. */
function mapAuthErrorToTurkish(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return "E-posta adresi geçersiz görünüyor. Lütfen kontrol edin.";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed to fetch")
  ) {
    return "Supabase sunucusuna bağlanılamadı. .env.local içindeki Project URL doğru mu ve proje aktif mi kontrol edin.";
  }

  return "Giriş linki gönderilemedi. Lütfen daha sonra tekrar deneyin.";
}
