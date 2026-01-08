
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, Clock, Star, Sparkles } from 'lucide-react';
import type { getDictionary } from "@/lib/get-dictionary";
import { Logo } from "../Logo";
import { usePathname } from "next/navigation";
import { Locale } from "@/i18n-config";

interface FooterProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['secondaryFooter'];
}

export function SecondaryFooter({ dictionary }: FooterProps) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const pathname = usePathname();
  const lang = (pathname?.split('/')[1] || 'en') as Locale;

  useEffect(() => {
    // This effect runs only on the client, after hydration
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  return (
    <footer className="bg-gradient-to-br from-foreground to-[#05442F] text-background mt-16">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
                <Logo className="h-12 w-auto" />
                <div className="flex flex-col -space-y-1">
                    <span className="font-headline text-xl font-bold text-background">TeeReserve</span>
                    <span className="font-headline text-xl font-bold text-primary">Golf</span>
                </div>
            </div>
            <p className="text-background/80 text-sm leading-relaxed mb-6">
              {dictionary.platformDescription}
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.facebook.com/teereservegolf"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 bg-primary/20 hover:bg-primary/30 border border-primary/30 hover:border-primary/50 rounded-full flex items-center justify-center transition-all duration-200 group"
              >
                <Facebook className="w-5 h-5 text-primary group-hover:text-primary/90" />
              </a>
              <a
                href="https://www.instagram.com/teereservegolf"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 bg-primary/20 hover:bg-primary/30 border border-primary/30 hover:border-primary/50 rounded-full flex items-center justify-center transition-all duration-200 group"
              >
                <Instagram className="w-5 h-5 text-primary group-hover:text-primary/90" />
              </a>
              <a
                href="https://x.com/TeeReserveGolf"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-10 h-10 bg-primary/20 hover:bg-primary/30 border border-primary/30 hover:border-primary/50 rounded-full flex items-center justify-center transition-all duration-200 group"
              >
                <Twitter className="w-5 h-5 text-primary group-hover:text-primary/90" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-6">{dictionary.quickLinks}</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href={`/${lang}/courses`} 
                  className="text-background/80 hover:text-white transition-colors flex items-center group"
                >
                  <span className="w-1 h-1 bg-primary/80 rounded-full mr-3 group-hover:bg-primary transition-colors"></span>
                  {dictionary.golfCourses}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${lang}/courses`}
                  className="text-background/80 hover:text-white transition-colors flex items-center group"
                >
                  <span className="w-1 h-1 bg-primary/80 rounded-full mr-3 group-hover:bg-primary transition-colors"></span>
                  {dictionary.book}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-6">{dictionary.contactInfo}</h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-background/80 text-sm">{dictionary.reservations}</p>
                  <p className="text-white font-semibold">+52 (624) 135 2986</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-background/80 text-sm">Email</p>
                  <p className="text-white font-semibold">info@teereserve.golf</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-background/80 text-sm">{dictionary.offices}</p>
                  <p className="text-white font-semibold">Los Cabos, BCS</p>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-6">{dictionary.ourService}</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-background/80 text-sm">{dictionary.supportHours}</p>
                  <p className="text-white font-semibold">{dictionary.online247}</p>
                  <p className="text-background/70 text-xs">{dictionary.phoneHours}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Star className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-background/80 text-sm">{dictionary.rating}</p>
                  <p className="text-white font-semibold">4.8/5 ⭐</p>
                  <p className="text-background/70 text-xs">{dictionary.ratingCount}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 mt-6">
                <h5 className="text-white font-semibold mb-2">{dictionary.needHelp}</h5>
                <Link 
                  href={`/${lang}/contact`}
                  className="text-primary hover:text-primary/80 text-sm transition-colors"
                >
                  {dictionary.contact} →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-6 pt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-background/80 text-sm min-h-[20px]">
              {currentYear ? `© ${currentYear} TeeReserve Golf. ${dictionary.allRightsReserved}` : '\u00A0'}
            </div>
            <div className="flex flex-wrap gap-6">
              <Link 
                href={`/${lang}/privacy`}
                className="text-background/80 hover:text-white text-sm transition-colors"
              >
                {dictionary.privacyPolicy}
              </Link>
              <Link 
                href={`/${lang}/terms`}
                className="text-background/80 hover:text-white text-sm transition-colors"
              >
                {dictionary.termsOfService}
              </Link>
               <span className="text-background/80 text-sm">
                {dictionary.madeIn}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
