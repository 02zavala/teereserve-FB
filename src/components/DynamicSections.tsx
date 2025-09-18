"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, DollarSign, Clock, Users, Ticket } from "lucide-react";
import { getCMSSections } from "@/lib/data";
import type { CMSSection, CMSEventSection, CMSTextSection, CMSHeroSection } from "@/types";

interface DynamicSectionsProps {
  className?: string;
}

export function DynamicSections({ className }: DynamicSectionsProps) {
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang as string || 'es';

  const handleTicketPurchase = (eventSection: CMSEventSection) => {
    // Crear parámetros para el checkout del evento usando el formato del checkout existente
    const checkoutParams = new URLSearchParams({
      courseId: 'event-' + eventSection.id, // Usar un ID especial para eventos
      courseName: eventSection.title,
      date: eventSection.content.eventDate || new Date().toISOString().split('T')[0],
      time: eventSection.content.eventTime || '10:00',
      players: '1', // Para eventos, cada ticket es por persona
      holes: '0', // No aplica para eventos
      price: eventSection.content.eventPrice?.toString() || '0',
      teeTimeId: 'event-ticket-' + eventSection.id,
      comments: 'Compra de ticket para evento: ' + eventSection.title,
      type: 'event'
    });
    
    // Navegar al formulario de checkout
    router.push(`/${lang}/book/checkout?${checkoutParams.toString()}`);
  };

  useEffect(() => {
    const loadSections = async () => {
      try {
        const sectionsData = await getCMSSections();
        // Only show active sections, sorted by order
        const activeSections = sectionsData
          .filter(section => section.isActive)
          .sort((a, b) => a.order - b.order);
        setSections(activeSections);
      } catch (error) {
        console.error('Error loading sections:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSections();
  }, []);

  const renderEventSection = (section: CMSSection) => {
    const content = section.content as CMSEventSection['content'];
    
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{content.eventTitle}</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {section.title}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              <Ticket className="h-4 w-4 mr-1" />
              Evento Especial
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {content.eventDescription}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {new Date(content.eventDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">{content.eventTime}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">{content.eventLocation}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {content.soldTickets || 0} / {content.maxTickets} tickets vendidos
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center items-center space-y-4 p-6 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-6 w-6 text-primary" />
                  <span className="text-3xl font-bold text-primary">
                    {content.eventPrice}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    {content.eventCurrency}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">por persona</p>
              </div>
              
              {content.isTicketSaleActive && (
                <Button size="lg" className="w-full" onClick={() => handleTicketPurchase(section as CMSEventSection)}>
                  <Ticket className="h-4 w-4 mr-2" />
                  Comprar Tickets
                </Button>
              )}
              
              {!content.isTicketSaleActive && (
                <Badge variant="outline" className="text-muted-foreground">
                  Venta de tickets no disponible
                </Badge>
              )}
            </div>
          </div>
          
          {content.eventFeatures && content.eventFeatures.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3">Incluye:</h4>
              <div className="flex flex-wrap gap-2">
                {content.eventFeatures.map((feature, index) => (
                  <Badge key={index} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTextSection = (section: CMSSection) => {
    const content = section.content as CMSTextSection['content'];
    
    return (
      <div className={`text-${content.alignment || 'left'} space-y-4`}>
        {content.headline && (
          <h2 className="text-3xl font-bold text-primary">{content.headline}</h2>
        )}
        {content.body && (
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {content.body}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderHeroSection = (section: CMSSection) => {
    const content = section.content as CMSHeroSection['content'];
    
    return (
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {content.headline && (
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                {content.headline}
              </h1>
            )}
            {content.subheadline && (
              <p className="text-xl md:text-2xl text-primary-foreground/90">
                {content.subheadline}
              </p>
            )}
            {content.ctaText && content.ctaLink && (
              <div className="pt-4">
                <Button size="lg" variant="secondary" asChild>
                  <a href={content.ctaLink}>
                    {content.ctaText}
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (section: CMSSection) => {
    switch (section.type) {
      case 'event':
        return renderEventSection(section);
      case 'text':
        return renderTextSection(section);
      case 'hero':
        return renderHeroSection(section);
      case 'image':
        return (
          <div className="text-center">
            <img 
              src={section.content.imageUrl} 
              alt={section.content.altText || section.title}
              className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
            />
            {section.content.caption && (
              <p className="mt-2 text-sm text-muted-foreground">
                {section.content.caption}
              </p>
            )}
          </div>
        );
      case 'cta':
        return (
          <Card className="text-center">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">{section.content.headline}</h3>
              {section.content.description && (
                <p className="text-muted-foreground mb-6">{section.content.description}</p>
              )}
              <Button size="lg" asChild>
                <a href={section.content.buttonLink}>
                  {section.content.buttonText}
                </a>
              </Button>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Tipo de sección no soportado: {section.type}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <div className={`space-y-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {sections.map((section) => (
        <div key={section.id} className="w-full">
          {renderSection(section)}
        </div>
      ))}
    </div>
  );
}