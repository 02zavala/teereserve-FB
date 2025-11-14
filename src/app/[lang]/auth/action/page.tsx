"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode, getAuth } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, AlertTriangle } from "lucide-react";

interface ActionPageProps {
  params: Promise<{ lang: string }>;
}

export default function AuthActionPage({ params }: ActionPageProps) {
  const { lang: rawLang } = React.use(params);
  const lang = rawLang === "en" ? "en" : "es";
  const search = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const mode = search.get("mode");
    const oobCode = search.get("oobCode");
    if (!mode || !oobCode) {
      setStatus("error");
      setErrorMessage(
        lang === "es" ? "Falta información en el enlace." : "Missing information in the link."
      );
      return;
    }

    const run = async () => {
      setStatus("processing");
      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth ?? getAuth(), oobCode);
          try {
            await auth.currentUser?.reload();
          } catch {}
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(
            lang === "es" ? "Acción no soportada." : "Unsupported action."
          );
        }
      } catch (e: any) {
        const code = e?.code as string | undefined;
        let msgEs = "No pudimos verificar tu correo. Solicita un nuevo enlace.";
        let msgEn = "We couldn't verify your email. Request a new link.";
        if (code === "auth/expired-action-code") {
          msgEs = "El enlace ha expirado. Solicita un nuevo correo.";
          msgEn = "The link has expired. Please request a new email.";
        } else if (code === "auth/invalid-action-code") {
          msgEs = "El enlace no es válido. Solicita un nuevo correo.";
          msgEn = "The link is invalid. Please request a new email.";
        }
        setErrorMessage(lang === "es" ? msgEs : msgEn);
        setStatus("error");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goHome = () => router.replace(`/${lang}`);
  const goResend = () => router.replace(`/${lang}/verify-email`);

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {status === "processing" && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <MailCheck className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">
                    {lang === "es" ? "Verificando enlace..." : "Verifying link..."}
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  {lang === "es"
                    ? "Estamos confirmando tu verificación."
                    : "We are confirming your verification."}
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MailCheck className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">
                    {lang === "es" ? "¡Correo verificado!" : "Email verified!"}
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  {lang === "es"
                    ? "Tu cuenta está verificada. Puedes continuar."
                    : "Your account is verified. You can continue."}
                </p>
                <Button onClick={goHome}>
                  {lang === "es" ? "Ir al inicio" : "Go to home"}
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <h1 className="text-2xl font-bold">
                    {lang === "es" ? "No se pudo verificar" : "Verification failed"}
                  </h1>
                </div>
                {errorMessage && (
                  <p className="text-muted-foreground">{errorMessage}</p>
                )}
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={goHome}>
                    {lang === "es" ? "Volver" : "Back"}
                  </Button>
                  <Button onClick={goResend}>
                    {lang === "es" ? "Reenviar verificación" : "Resend verification"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}