"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MailCheck, RefreshCcw } from "lucide-react";
import { sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";

interface VerifyEmailPageProps {
  params: { lang: string };
}

export default function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const lang = params?.lang === "en" ? "en" : "es";
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const isEnabled = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true';

  // Show info when verification is disabled
  React.useEffect(() => {
    if (!isEnabled) {
      setMessage(
        lang === 'es'
          ? 'La verificación por email está desactivada temporalmente.'
          : 'Email verification is temporarily disabled.'
      );
    }
  }, [isEnabled, lang]);

  const handleResend = async () => {
    if (!user || !isEnabled) return;
    setResending(true);
    setMessage(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const actionCodeSettings = origin
        ? {
            url: `${origin}/${lang}/auth/action`,
            handleCodeInApp: true,
          }
        : undefined;
      await sendEmailVerification(user, actionCodeSettings as any);
      setMessage(
        lang === "es"
          ? "Hemos reenviado el enlace de verificación. Revisa tu bandeja y spam."
          : "We resent the verification link. Check your inbox and spam."
      );
    } catch (e) {
      setMessage(
        lang === "es"
          ? "No pudimos reenviar el correo. Intenta de nuevo más tarde."
          : "Could not resend email. Please try again later."
      );
    } finally {
      setResending(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!user) return;
    setMessage(null);
    try {
      await user.reload();
      if (user.emailVerified) {
        router.replace(`/${lang}`);
      } else {
        setMessage(
          lang === "es"
            ? "Tu correo aún no está verificado. Vuelve a intentarlo."
            : "Your email is still not verified. Try again."
        );
      }
    } catch (e) {
      setMessage(
        lang === "es"
          ? "No pudimos comprobar la verificación. Intenta nuevamente."
          : "Could not check verification. Please try again."
      );
    }
  };

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <MailCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">
                {lang === "es" ? "Verifica tu correo" : "Verify your email"}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {lang === "es"
                ? "Te enviamos un email con un enlace para verificar tu cuenta. Revisa tu bandeja de entrada y la carpeta de spam."
                : "We sent you an email with a link to verify your account. Please check your inbox and your spam folder."}
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleResend} disabled={resending || !user || !isEnabled}>
                {resending ? (
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                {lang === "es" ? "Reenviar verificación" : "Resend verification"}
              </Button>
              <Button variant="secondary" onClick={handleRefreshVerification} disabled={!user}>
                <MailCheck className="mr-2 h-4 w-4" />
                {lang === "es" ? "Ya verifiqué" : "I verified"}
              </Button>
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}