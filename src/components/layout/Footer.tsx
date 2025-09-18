
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Instagram, Mail, Phone, Globe } from 'lucide-react';
import type { getSharedDictionary } from "@/lib/dictionaries/shared";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { Locale } from "@/i18n-config";

interface FooterProps {
  dictionary: Awaited<ReturnType<typeof getSharedDictionary>>;
  lang: Locale;
}

export function Footer({ dictionary, lang }: FooterProps) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  if (pathname?.includes('/admin')) {
    return null;
  }

  const reservationsLink = user ? `/${lang}/profile#bookings` : `/${lang}/booking-lookup`;

  return (
    <footer className="bg-card text-card-foreground border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-20 w-20">
                <Image
                  src="/logo-final.png"
                  alt="TeeReserve Golf"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="font-headline text-2xl font-bold text-foreground">TeeReserve</span>
                <span className="font-headline text-2xl font-bold text-primary">Golf</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              {dictionary.footer.platformDescription}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {dictionary.footer.platform}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href={`/${lang}/courses`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.footer.courses}
                </Link>
              </li>
              <li>
                <Link 
                  href={reservationsLink}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.footer.reservations}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${lang}/reviews`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.footer.reviews}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {dictionary.footer.support}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href={`/${lang}/help`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.footer.helpCenter}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${lang}/contact`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.footer.contact}
                </Link>
              </li>
              <li>
                <Link 
                  href="/api/status" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.footer.apiStatus}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {dictionary.footer.contactTitle}
            </h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-primary" />
                <a 
                  href="mailto:info@teereserve.golf"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  info@teereserve.golf
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-primary" />
                <a 
                  href="tel:+526241352986"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  +52 624 135 29 86
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-primary" />
                <a 
                  href="https://teereserve.golf"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  teereserve.golf
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">
                {dictionary.footer.followUs}
              </h4>
              <div className="flex space-x-4">
                <a
                  href="https://www.facebook.com/teereservegolf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://x.com/TeeReserveGolf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  aria-label="X (Twitter)"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/teereservegolf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-6 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              {currentYear ? `© ${currentYear} TeeReserve Golf. ${dictionary.footer.allRightsReserved}` : `\u00A0`}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link 
                href={`/${lang}/privacy`}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {dictionary.footer.privacyPolicy}
              </Link>
              <Link 
                href={`/${lang}/terms`}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {dictionary.footer.termsOfService}
              </Link>
              <p className="text-accent font-medium">
                {dictionary.footer.premiumExperience}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
