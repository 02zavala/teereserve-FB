
export const revalidate = 300;

import * as React from 'react';
import Image from 'next/image';
import { getDictionary } from "@/lib/get-dictionary";
import type { Locale } from "@/i18n-config";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Target, Users, Heart } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

import { getTeamMembers, getAboutPageContent } from '@/lib/data';


interface AboutPageProps {
    params: Promise<{ lang: Locale }>;
}

export default async function AboutPage({ params: paramsProp }: AboutPageProps) {
    const params = await paramsProp;
    const lang = params.lang;
    const dictionary = await getDictionary(lang);
    const t = dictionary.aboutPage;
    
    const [teamMembers, pageContent] = await Promise.all([
        getTeamMembers(),
        getAboutPageContent()
    ]);

    const values = [
        {
            icon: Heart,
            title: t.values.passion.title,
            description: t.values.passion.description
        },
        {
            icon: Award,
            title: t.values.quality.title,
            description: t.values.quality.description
        },
        {
            icon: Users,
            title: t.values.trust.title,
            description: t.values.trust.description
        }
    ];

    return (
        <div className="bg-background">
            {/* Hero Section */}
            <section className="relative h-[40vh] min-h-[300px] w-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center text-center">
                <Image
                    src={pageContent.heroImageUrl || "https://placehold.co/1920x800.png"}
                    alt={t.hero.imageAlt}
                    data-ai-hint="golf course team"
                    fill
                    sizes="100vw"
                    className="object-cover opacity-20"
                />
                <div className="relative z-10 px-4">
                    <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight text-primary-foreground">
                        {t.hero.title}
                    </h1>
                    <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90 md:text-xl">
                        {t.hero.subtitle}
                    </p>
                </div>
            </section>

            {/* Mission Section */}
             <section className="container mx-auto px-4 py-16 lg:py-24">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="md:pr-8">
                         <div className="flex justify-center md:justify-start mb-6">
                            <Logo className="h-20" />
                        </div>
                        <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">{t.mission.title}</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                           {t.mission.description}
                        </p>
                    </div>
                     <div className="relative aspect-square max-w-md mx-auto w-full">
                        <Image
                            src={pageContent.missionImageUrl || "https://placehold.co/600x600.png"}
                            alt={t.mission.imageAlt}
                            data-ai-hint="golf course detail"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover rounded-xl shadow-lg"
                        />
                    </div>
                </div>
            </section>

            {/* Values Section */}
             <section className="bg-card py-16 lg:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">{t.values.title}</h2>
                        <p className="mt-2 text-lg text-muted-foreground">{t.values.subtitle}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {values.map((value, index) => (
                            <Card key={index} className="text-center border-t-4 border-primary pt-6">
                                <CardContent>
                                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                        <value.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                                    <p className="text-muted-foreground text-sm">{value.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* Team Section */}
             <section className="container mx-auto px-4 py-16 lg:py-24">
                <div className="text-center mb-12">
                    <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">{t.team.title}</h2>
                    <p className="mt-2 text-lg text-muted-foreground">{t.team.subtitle}</p>
                </div>
                 <div className="flex justify-center flex-wrap gap-8">
                    {teamMembers.map((member) => (
                        <div key={member.id} className="flex flex-col items-center">
                            <Avatar className="w-24 h-24 mb-4 border-4 border-primary/50">
                                <AvatarImage src={member.avatarUrl} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h4 className="font-semibold text-lg">{member.name}</h4>
                            <p className="text-muted-foreground">{lang === 'es' ? member.role_es : member.role_en}</p>
                        </div>
                    ))}
                </div>
            </section>

             {/* CTA Section */}
            <section className="bg-muted/50 dark:bg-muted/20">
                <div className="container mx-auto px-4 py-16 text-center">
                    <h2 className="font-headline text-3xl font-bold text-primary mb-4">{t.cta.title}</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">{t.cta.subtitle}</p>
                    <Button size="lg" asChild>
                       <Link href={`/${lang}/courses`}>
                        {t.cta.button}
                       </Link>
                    </Button>
                </div>
            </section>
       
        </div>
    );
}
