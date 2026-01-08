
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, Star } from 'lucide-react'
import type { getDictionary } from '@/lib/get-dictionary'
import type { Locale } from '@/i18n-config'
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { getHeroImagesContent, type HeroImagesContent } from '@/lib/data'
import { HeroSectionClient } from './HeroSectionClient'

interface HeroSectionProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['heroSection'];
    lang: Locale;
}



export async function HeroSection({ dictionary, lang }: HeroSectionProps) {
  // Load hero images from database
  const heroImagesContent = await getHeroImagesContent();
  const heroImages = [
    heroImagesContent.image1Url,
    heroImagesContent.image2Url,
    heroImagesContent.image3Url,
    heroImagesContent.image4Url,
  ];

  return (
    <HeroSectionClient 
      dictionary={dictionary} 
      lang={lang} 
      heroImages={heroImages} 
    />
  );
}
