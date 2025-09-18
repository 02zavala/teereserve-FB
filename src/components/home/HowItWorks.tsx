
import { Search, Calendar, CreditCard, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { getDictionary } from '@/lib/get-dictionary';
import type { Locale } from '@/i18n-config';

interface HowItWorksProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['howItWorks'];
    lang: Locale;
}

export function HowItWorks({ dictionary, lang }: HowItWorksProps) {
    const steps = [
        {
            icon: Search,
            title: dictionary.steps.search.title,
            description: dictionary.steps.search.description,
        },
        {
            icon: Calendar,
            title: dictionary.steps.select.title,
            description: dictionary.steps.select.description,
        },
        {
            icon: CreditCard,
            title: dictionary.steps.pay.title,
            description: dictionary.steps.pay.description,
        },
        {
            icon: Play,
            title: dictionary.steps.play.title,
            description: dictionary.steps.play.description,
        }
    ];

    return (
        <section className="bg-card py-16 lg:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="font-headline text-3xl font-bold text-primary md:text-4xl mb-4">
                        {dictionary.title}
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        {dictionary.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon;
                        return (
                            <div key={index} className="flex flex-col items-center text-center">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                        <IconComponent className="h-10 w-10 text-primary" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center mt-16 rounded-lg p-8">
                    <h3 className="text-2xl font-semibold text-primary mb-4">
                        {dictionary.cta.title}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                        {dictionary.cta.subtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" asChild>
                            <Link href={`/${lang}/courses`}>
                               {dictionary.cta.bookButton}
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                             <Link href={`/${lang}/courses`}>
                               {dictionary.cta.exploreButton}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
