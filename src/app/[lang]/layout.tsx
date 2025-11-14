
import * as React from 'react';
import { Locale, i18n } from "@/i18n-config";
import { CookieConsent } from "@/components/CookieConsent";
import { getDictionarySection } from "@/lib/get-dictionary";
import { getSharedDictionary } from "@/lib/dictionaries/shared";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ExitIntentModal } from '@/components/ExitIntentModal';

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default async function RootLayout({
  children,
  params: paramsProp,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const params = await paramsProp;
  
  // Load shared dictionary for Header and Footer
  const sharedDictionary = await getSharedDictionary(params.lang);
  
  // Load only the cookieConsent section for CookieConsent component
  const cookieConsentDict = await getDictionarySection(params.lang, 'cookieConsent');
  const exitIntentDict = await getDictionarySection(params.lang, 'exitIntent');

  return (
    <div className="relative flex min-h-screen flex-col">
       <Header dictionary={sharedDictionary} lang={params.lang} />
       <main className="flex-1">{children}</main>
       <Footer dictionary={sharedDictionary} lang={params.lang} />
       <CookieConsent dictionary={cookieConsentDict} />
       <WhatsAppButton />
       {/* Exit intent modal, client-side only */}
       <ExitIntentModal lang={params.lang} dictionary={exitIntentDict} />
    </div>
  );
}
