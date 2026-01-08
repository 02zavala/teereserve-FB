"use client";

import { useEffect, useState } from 'react';
import { WelcomeOnboarding } from './WelcomeOnboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import { usePathname } from 'next/navigation';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/lib/get-dictionary';

interface OnboardingProviderProps {
  children: React.ReactNode;
  lang: Locale;
}

export function OnboardingProvider({ children, lang }: OnboardingProviderProps) {
  const { showOnboarding, completeOnboarding, setShowOnboarding } = useOnboarding();
  const [dictionary, setDictionary] = useState<any>(null);
  const pathname = usePathname();

  // Cargar el diccionario
  useEffect(() => {
    const loadDictionary = async () => {
      try {
        // Validar que lang sea válido
        if (!lang || (lang !== 'en' && lang !== 'es')) {
          console.warn('Invalid locale:', lang, 'defaulting to en');
          const dict = await getDictionary('en');
          setDictionary(dict);
          return;
        }
        
        const dict = await getDictionary(lang);
        setDictionary(dict);
      } catch (error) {
        console.error('Error loading dictionary:', error);
        // Fallback a inglés en caso de error
        try {
          const fallbackDict = await getDictionary('en');
          setDictionary(fallbackDict);
        } catch (fallbackError) {
          console.error('Error loading fallback dictionary:', fallbackError);
        }
      }
    };

    loadDictionary();
  }, [lang]);

  // El evento de trigger se maneja ahora en el hook useOnboarding

  const handleCloseOnboarding = () => {
    completeOnboarding();
  };

  // Solo mostrar onboarding cuando sea explícitamente activado
  // Permitir onboarding en signup solo cuando se active manualmente
  const shouldShowOnboarding = showOnboarding && 
    dictionary && 
    dictionary.onboarding &&
    pathname &&
    !pathname.includes('/admin') && 
    !pathname.includes('/auth') &&
    !pathname.includes('/login');

  return (
    <>
      {children}
      {shouldShowOnboarding && (
        <WelcomeOnboarding
          isOpen={true}
          onClose={handleCloseOnboarding}
          dictionary={dictionary.onboarding}
        />
      )}
    </>
  );
}