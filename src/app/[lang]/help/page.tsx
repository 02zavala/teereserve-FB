
import * as React from 'react';
import Link from "next/link";
import { ArrowLeft, Phone, Mail, MessageCircle } from "lucide-react";
export const revalidate = 300;

import { getDictionary } from "@/lib/get-dictionary";
import type { Locale } from "@/i18n-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface HelpPageProps {
    params: Promise<{ lang: Locale }>;
}

export default async function HelpPage({ params: paramsProp }: HelpPageProps) {
  const params = await paramsProp;
  const lang = params.lang;
  const dictionary = await getDictionary(lang);
  const t = dictionary.helpPage;

  const contactOptions = [
    {
      icon: MessageCircle,
      title: t.whatsapp.title,
      description: t.whatsapp.description,
      buttonText: t.whatsapp.buttonText,
      href: "https://wa.me/526241352986?text=Hola%20TeeReserve%20Golf,%20tengo%20una%20pregunta."
    },
    {
      icon: Phone,
      title: t.phone.title,
      description: t.phone.description,
      buttonText: "+52 624 135 29 86",
      href: "tel:+526241352986"
    },
    {
      icon: Mail,
      title: t.email.title,
      description: t.email.description,
      buttonText: "info@teereserve.golf",
      href: "mailto:info@teereserve.golf"
    }
  ];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="py-16 px-4 relative overflow-hidden bg-gradient-to-br from-primary to-[#05442F]">
        <div className="container mx-auto text-center relative z-10">
          <Button variant="ghost" asChild className="mb-6 text-primary-foreground/80 hover:text-primary-foreground">
            <Link href="/" className="inline-flex items-center transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t.backToHome}
            </Link>
          </Button>
          
          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-4 leading-tight font-headline">
            {t.title}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {contactOptions.map((option, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-8">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <option.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-primary mb-4 font-headline">{option.title}</h3>
                    <p className="text-muted-foreground mb-6 min-h-[70px]">{option.description}</p>
                    <Button asChild size="lg">
                        <a href={option.href} target="_blank" rel="noopener noreferrer">
                            {option.buttonText}
                        </a>
                    </Button>
                  </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <Card className="p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8 text-center font-headline">{t.faq.title}</h2>
            <Accordion type="single" collapsible className="w-full max-w-4xl mx-auto">
              {t.faq.questions.map((item: { question: string; answer: string }, index: number) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-lg text-left hover:no-underline">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>
      </section>
    </div>
  );
}
