"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithEmail } from "@/lib/supabase/auth";

/**
 * Magic Link giriş formu — gerçek Supabase OTP entegrasyonu.
 */
function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "1") {
      setIsError(true);
      setMessage(
        "Giriş linki doğrulanamadı veya süresi dolmuş. Lütfen yeni bir link isteyin."
      );
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    const result = await signInWithEmail(email);

    if (result.success) {
      setIsError(false);
      setMessage(
        "Giriş linki e-posta adresinize gönderildi. Lütfen e-posta kutunuzu kontrol edin."
      );
    } else {
      setIsError(true);
      setMessage(
        result.errorMessage ??
          "Giriş linki gönderilemedi. Lütfen tekrar deneyin."
      );
    }

    setIsSubmitting(false);
  }

  return (
    <Card className="w-full max-w-md bg-white shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Fuzyon Makina CRM</CardTitle>
        <CardDescription>
          E-posta adresinize tek kullanımlık giriş linki göndereceğiz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="ornek@firma.de"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !email.trim()}
          >
            {isSubmitting ? "Gönderiliyor..." : "Giriş Linki Gönder"}
          </Button>

          {message ? (
            <p
              className={`text-sm ${
                isError ? "text-red-600" : "text-emerald-700"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500">Giriş sayfası yükleniyor...</p>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
