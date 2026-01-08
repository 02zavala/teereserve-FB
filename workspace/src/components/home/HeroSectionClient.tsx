'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, Star } from 'lucide-react'
import type { getDictionary } from '@/lib/get-dictionary'
import type { Locale } from '@/i18n-config'
import Autoplay from 'embla-carousel-autoplay'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

interface HeroSectionClientProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['heroSection'];
    lang: Locale;
    heroImages: string[];
}

export function HeroSectionClient({ dictionary, lang, heroImages }: HeroSectionClientProps) {
  return (
    <section className="relative h-[50vh] min-h-[360px] lg:h-[60vh] lg:min-h-[450px] flex items-center justify-center overflow-hidden">
      {/* Background Image Carousel */}
      <Carousel
        className="absolute inset-0 z-0"
        opts={{
          loop: true,
        }}
        plugins={[Autoplay({ delay: 9000, stopOnInteraction: false, stopOnMouseEnter: false, stopOnFocusIn: false })]}
      >
        <CarouselContent className="-ml-0 h-full">
          {heroImages.map((src, index) => (
            <CarouselItem key={index} className="pl-0 relative h-full">
               <Image
                    src={src}
                    alt={`Hero background image ${index + 1}`}
                    data-ai-hint="golf course sunrise"
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    priority={true}
                />
            </CarouselItem>
          ))}
        </CarouselContent>
        {heroImages.length > 1 && (
            <>
                <CarouselPrevious className="left-4 z-20" />
                <CarouselNext className="right-4 z-20" />
            </>
        )}
      </Carousel
      >

        {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 z-10" />

      {/* Content */}
      <div className="relative z-20 text-center text-white max-w-3xl mx-auto px-3 sm:px-5 lg:px-7 backdrop-blur-sm bg-black/15 rounded-lg py-7">
        <h1 className="font-headline text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 lg:mb-6">
          {dictionary.title} <span className="text-primary">{dictionary.titleHighlight}</span>
        </h1>

        <p className="text-base md:text-lg lg:text-xl mb-6 lg:mb-8 text-white/90 dark:text-primary/90 max-w-3xl mx-auto">
          {dictionary.subtitle}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 lg:mb-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{dictionary.stats.courses.value}</div>
            <div className="text-xs md:text-sm text-primary-foreground/80">{dictionary.stats.courses.label}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{dictionary.stats.golfers.value}</div>
            <div className="text-xs md:text-sm text-primary-foreground/80">{dictionary.stats.golfers.label}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{dictionary.stats.rating.value}</div>
            <div className="text-xs md:text-sm text-primary-foreground/80 flex items-center justify-center gap-1">
              <Star className="h-3 w-3 fill-current" />
              {dictionary.stats.rating.label}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{dictionary.stats.support.value}</div>
            <div className="text-xs md:text-sm text-primary-foreground/80">{dictionary.stats.support.label}</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 lg:mb-12">
          <Button
            size="lg"
            className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4 h-auto w-full sm:w-auto"
            asChild
          >
            <Link href={`/${lang}/courses`}>
              <Calendar className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              {dictionary.bookButton}
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="border-white text-white hover:bg-white/10 text-base md:text-lg px-6 md:px-8 py-3 md:py-4 h-auto w-full sm:w-auto"
            asChild
          >
            <Link href={`/${lang}/mapa`}>
              <MapPin className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              {dictionary.exploreButton}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
