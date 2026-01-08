
import * as React from 'react';
import { getDictionary } from "@/lib/get-dictionary";
import type { Locale } from "@/i18n-config";

import { Card, CardContent } from "@/components/ui/card";

interface PrivacyPageProps {
    params: Promise<{ lang: Locale }>;
}

export default async function PrivacyPage({ params: paramsProp }: PrivacyPageProps) {
    const params = await paramsProp;
    const lang = params.lang;
    const dictionary = await getDictionary(lang);
    const t = dictionary.privacyPage;

    return (
        <div className="bg-background">
            <div className="container mx-auto max-w-4xl px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">{t.title}</h1>
                    <p className="mt-2 text-lg text-muted-foreground">{t.subtitle}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t.lastUpdated}</p>
                </div>

                <Card>
                    <CardContent className="p-8 space-y-6 text-foreground/80 leading-relaxed">
                        <p>{t.introduction}</p>
                        
                        {t.sections.map((section: { title: string; content: string }, index: number) => (
                            <div key={index}>
                                <h2 className="font-headline text-2xl font-bold text-primary mb-3">{section.title}</h2>
                                <div className="space-y-4 prose prose-sm max-w-none prose-p:text-foreground/80 prose-li:text-foreground/80 prose-a:text-primary" dangerouslySetInnerHTML={{ __html: section.content }} />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
    
        </div>
    );
}
