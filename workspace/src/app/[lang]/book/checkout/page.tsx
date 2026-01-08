"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "@/components/CheckoutForm";
import type { Locale } from "@/i18n-config";
import * as Sentry from "@sentry/nextjs";
import { gtagEvent, getGaClientId } from "@/lib/ga";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const { lang } = useParams() as { lang: Locale };
  const searchParams = useSearchParams();

  const courseId = searchParams.get("courseId");
  const time = searchParams.get("time");
  const date = searchParams.get("date");
  const players = searchParams.get("players");
  const holes = searchParams.get("holes");
  const basePrice = searchParams.get("price");
  const promoCode = searchParams.get("promo");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !time || !date || !players || !holes) return;
    (async () => {
      try {
        const quoteRes = await fetch(`/api/checkout/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            date,
            time,
            players: parseInt(players!),
            holes: parseInt(holes!),
            basePrice: basePrice ? parseFloat(basePrice) : undefined,
            promoCode: promoCode || undefined,
          }),
        });
        if (!quoteRes.ok) {
          throw new Error(`Quote error ${quoteRes.status}`);
        }
        const quote = await quoteRes.json();

        const csrf = await fetch(`/api/csrf-token`, {
          method: "GET",
          credentials: "include",
        }).then(r => r.json()).catch(() => ({ token: null }));

        const intentRes = await fetch(`/api/checkout/create-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            courseId,
            date,
            time,
            players: parseInt(players!),
            holes: parseInt(holes!),
            currency: quote.currency,
            tax_rate: quote.tax_rate,
            subtotal_cents: quote.subtotal_cents,
            discount_cents: quote.discount_cents,
            tax_cents: quote.tax_cents,
            total_cents: quote.total_cents,
            quote_hash: quote.quote_hash,
            expires_at: quote.expires_at,
            promoCode: quote.promo_code,
            courseName: (typeof window !== 'undefined' ? (document.querySelector('h1')?.textContent || '') : '') || undefined,
            client_id: getGaClientId() || undefined,
          }),
        });
        if (!intentRes.ok) {
          const errData = await intentRes.json().catch(() => ({}));
          setIntentError(errData.error || `Intent error ${intentRes.status}`);
          return;
        }
        const intentData = await intentRes.json();
        setClientSecret(intentData.client_secret || intentData.clientSecret || null);
        try {
          gtagEvent('begin_checkout', {
            currency: quote.currency || 'USD',
            value: (quote.total_cents || 0) / 100,
            items: [
              {
                item_id: courseId!,
                item_name: (typeof window !== 'undefined' ? (document.querySelector('h1')?.textContent || '') : '') || 'Course',
                item_category: 'golf_course',
                price: (quote.subtotal_cents || 0) / 100,
                quantity: parseInt(players!),
              },
            ],
          });
        } catch {}
      } catch (err) {
        setIntentError((err as any)?.message || 'No se pudo iniciar el pago');
        try { Sentry.captureException(err as any); } catch {}
      }
    })();
  }, [courseId, time, date, players, holes, basePrice, promoCode]);

  if (!clientSecret) {
    if (intentError) {
      return <div className="text-sm text-red-600">{intentError}</div>;
    }
    return <div>Cargando pago...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm lang={lang} />
    </Elements>
  );
}
