
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { i18n, type Locale } from '@/i18n-config'
import { Button } from '../ui/button'
import { Languages } from 'lucide-react'

interface LanguageSwitcherProps {
    dictionary: {
        label: string;
        en: string;
        es: string;
    },
    lang: Locale;
}

export function LanguageSwitcher({ dictionary, lang }: LanguageSwitcherProps) {
  const pathName = usePathname()

  const redirectedPathName = (locale: Locale) => {
    if (!pathName) return '/'
    const segments = pathName.split('/')
    segments[1] = locale
    return segments.join('/')
  }
  
  const otherLang = lang === 'en' ? 'es' : 'en'
  const otherLangLabel = lang === 'en' ? dictionary.es : dictionary.en;

  return (
    <Button variant="ghost" asChild>
        <Link href={redirectedPathName(otherLang)} aria-label={dictionary.label}>
            <Languages className="mr-2 h-4 w-4" />
            {otherLangLabel}
        </Link>
    </Button>
  )
}
