"use client";
import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLogger } from "@/hooks/useLogger";
import type { Locale } from "@/i18n-config";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CancelPage() {
  const { logEvent } = useLogger();
  const { lang } = useParams() as { lang: Locale };
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") || "";
  const time = searchParams.get("time") || "";

  useEffect(() => {
    if (courseId && time) {
      logEvent("payment_abandoned", { courseId, teeTime: time, stage: "abandoned", lang });
    }
  }, [courseId, time, lang, logEvent]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
      <h1 className="text-2xl font-bold mb-4">Pago cancelado</h1>
      <p className="text-muted-foreground mb-8">Tu pago no se completó. Puedes reintentar o explorar otros campos.</p>
      <div className="flex items-center justify-center gap-4">
        <Button asChild>
          <Link href={`/${lang}/book/checkout?courseId=${courseId}&time=${time}`}>Reintentar pago</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${lang}/courses`}>Explorar campos</Link>
        </Button>
      </div>
    </div>
  );
}