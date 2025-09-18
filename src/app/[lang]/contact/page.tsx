
import * as React from 'react';
import { getDictionary } from "@/lib/get-dictionary";
import type { Locale } from "@/i18n-config";
import { Mail, Phone, MapPin, AlertTriangle } from "lucide-react";
import { ContactPageClient } from "./ContactPageClient";
import { Card, CardContent } from "@/components/ui/card";


interface ContactPageProps {
    params: Promise<{ lang: Locale }>;
}

export default async function ContactPage({ params: paramsProp }: ContactPageProps) {
    const params = await paramsProp;
    const lang = params.lang;
    const dictionary = await getDictionary(lang);
    const t = dictionary.contactPage;
    const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    // Check if the key is present and not the default placeholder
    const isRecaptchaConfigured = recaptchaKey && !recaptchaKey.startsWith('your_');

    return (
        <div className="bg-background">
            <div className="container mx-auto max-w-6xl px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">{t.title}</h1>
                    <p className="mt-2 text-lg text-muted-foreground">{t.subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-start">
                    {/* Form Section */}
                    <div className="md:col-span-3">
                         {isRecaptchaConfigured ? (
                            <ContactPageClient dictionary={t.form} recaptchaKey={recaptchaKey} />
                        ) : (
                            <Card className="border-dashed border-2">
                                <CardContent className="p-8 text-center text-muted-foreground">
                                    <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-amber-500" />
                                    <h3 className="font-semibold text-lg text-foreground mb-2">Formulario Deshabilitado</h3>
                                    <p className="text-sm">
                                        El envío de formularios está deshabilitado temporalmente. Por favor, contáctanos a través de los métodos a continuación.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-card p-6 rounded-lg border">
                             <h3 className="font-headline text-2xl font-semibold text-primary mb-4">{t.info.title}</h3>
                             <div className="space-y-4">
                                <a href="mailto:info@teereserve.golf" className="flex items-center space-x-3 group">
                                    <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                                        <Mail className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t.info.emailLabel}</p>
                                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">info@teereserve.golf</p>
                                    </div>
                                </a>
                                 <a href="tel:+526241352986" className="flex items-center space-x-3 group">
                                     <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                                        <Phone className="h-5 w-5 text-primary" />
                                     </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t.info.phoneLabel}</p>
                                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">+52 624 135 29 86</p>
                                    </div>
                                </a>
                                <div className="flex items-start space-x-3">
                                    <div className="bg-primary/10 p-3 rounded-full">
                                        <MapPin className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t.info.addressLabel}</p>
                                        <p className="font-semibold text-foreground">Los Cabos, B.C.S., México</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                        <div className="aspect-video w-full">
                             <iframe
                                className="w-full h-full rounded-xl border-0"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d59685.8039899103!2d-109.9515629513672!3d22.910350400000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x86af4a5e1f0e3f2d%3A0x8e5e7d1a5e1d8a1e!2sCabo%20San%20Lucas%2C%20B.C.S.!5e0!3m2!1ses-419!2smx!4v1700000000000!5m2!1ses-419!2smx"
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
