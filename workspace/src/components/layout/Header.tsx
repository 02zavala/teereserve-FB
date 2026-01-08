"use client";

import Link from "next/link";
import Image from "next/image"; // ✅ NUEVO: usamos next/image para el logo
import { Menu, Sparkles, GanttChartSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserNavWrapper } from "@/components/auth/UserNavWrapper";
import type { Locale } from "@/i18n-config";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
// ❌ Quitamos: import { Logo } from "../Logo";
import { useAuth } from "@/context/AuthContext";
import type { getSharedDictionary } from "@/lib/dictionaries/shared";

type SharedDictionary = Awaited<ReturnType<typeof getSharedDictionary>>;

interface HeaderProps {
  dictionary: SharedDictionary;
  lang: Locale;
}

export function Header({ dictionary, lang }: HeaderProps) {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === "Admin" || userProfile?.role === "SuperAdmin";
  const t = dictionary.header;

  const navLinks = [
    { href: `/${lang}/courses`, label: t.findCourse },
    { href: `/${lang}/recommendations`, label: t.recommendations, icon: Sparkles },
    { href: `/${lang}/about`, label: t.about },
    { href: `/${lang}/contact`, label: t.contact },
  ];

  const mobileNavLinks = [...navLinks];
  if (isAdmin) {
    mobileNavLinks.push({ href: `/${lang}/admin/dashboard`, label: t.admin, icon: GanttChartSquare });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        {/* Logo y marca (solo cambiamos el Logo -> Image) */}
        <div className="flex items-center gap-2">
          <Link href={`/${lang}`} className="flex items-center space-x-2">
            <div className="w-12 h-12">
              <Image
                src="/logo-final.png"
                alt="TeeReserve Golf"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col -space-y-2">
              <span className="font-headline text-xl font-bold text-foreground">TeeReserve</span>
              <span className="font-headline text-xl font-bold text-primary">Golf</span>
            </div>
          </Link>
        </div>

        {/* Navegación de escritorio y controles */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1"
              >
                {link.icon && <link.icon className="h-4 w-4 text-primary" />}
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href={`/${lang}/admin/dashboard`}
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1 font-semibold text-primary"
              >
                <GanttChartSquare className="h-4 w-4" />
                {t.admin}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher dictionary={dictionary.languageSwitcher} lang={lang} />
            <ThemeToggle dictionary={dictionary.themeToggle} />
            <UserNavWrapper />
          </div>
        </div>

        {/* Navegación móvil */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[400px]">
              {/* Título accesible para el Sheet (oculto visualmente) */}
              <SheetHeader>
                <SheetTitle className="sr-only">Menú principal</SheetTitle>
              </SheetHeader>

              <Link href={`/${lang}`} className="flex items-center space-x-2">
                <div className="w-12 h-12">
                  <Image
                    src="/logo-final.png"
                    alt="TeeReserve Golf"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col -space-y-2">
                  <span className="font-headline text-xl font-bold text-foreground">TeeReserve</span>
                  <span className="font-headline text-xl font-bold text-primary">Golf</span>
                </div>
              </Link>

              <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                <div className="flex flex-col space-y-3 mb-4">
                  {mobileNavLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="text-foreground flex items-center gap-2">
                      {link.icon && <link.icon className="h-4 w-4 text-primary" />}
                      {link.label}
                    </Link>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher dictionary={dictionary.languageSwitcher} lang={lang} />
                  <ThemeToggle dictionary={dictionary.themeToggle} />
                  <UserNavWrapper />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
