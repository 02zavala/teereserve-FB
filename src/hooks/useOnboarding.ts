"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    // Solo verificar el onboarding si el usuario está autenticado
    if (user && userProfile) {
      const completed = localStorage.getItem('onboarding-completed');
      const userOnboardingKey = `onboarding-completed-${user.uid}`;
      const userCompleted = localStorage.getItem(userOnboardingKey);
      
      const isCompleted = completed === 'true' || userCompleted === 'true';
      setIsOnboardingCompleted(isCompleted);
      
      // No mostrar automáticamente el onboarding
      // Solo se mostrará cuando se active manualmente desde signup o login
      setShowOnboarding(false);
    }
  }, [user, userProfile]);

  // Escuchar el evento personalizado para activar el onboarding
  useEffect(() => {
    const handleTriggerOnboarding = () => {
      if (user && userProfile) {
        setShowOnboarding(true);
      }
    };

    window.addEventListener('trigger-onboarding', handleTriggerOnboarding);
    
    return () => {
      window.removeEventListener('trigger-onboarding', handleTriggerOnboarding);
    };
  }, [user, userProfile]);

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    setIsOnboardingCompleted(true);
    
    // Guardar en localStorage tanto global como por usuario
    localStorage.setItem('onboarding-completed', 'true');
    if (user) {
      localStorage.setItem(`onboarding-completed-${user.uid}`, 'true');
    }
  };

  const resetOnboarding = () => {
    setIsOnboardingCompleted(false);
    localStorage.removeItem('onboarding-completed');
    if (user) {
      localStorage.removeItem(`onboarding-completed-${user.uid}`);
    }
  };

  return {
    showOnboarding,
    isOnboardingCompleted,
    startOnboarding,
    completeOnboarding,
    resetOnboarding,
    setShowOnboarding
  };
}

// Hook para forzar el onboarding después del registro
export function useTriggerOnboarding() {
  const triggerOnboarding = () => {
    // Remover el flag de completado para forzar que aparezca
    localStorage.removeItem('onboarding-completed');
    
    // Disparar un evento personalizado que el hook principal puede escuchar
    window.dispatchEvent(new CustomEvent('trigger-onboarding'));
  };

  return { triggerOnboarding };
}