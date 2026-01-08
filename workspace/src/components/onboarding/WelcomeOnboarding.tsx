"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, MapPin, Calendar, CreditCard, Trophy, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import { useStableNavigation } from '@/hooks/useStableNavigation';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    href: string;
  };
}

interface WelcomeOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  dictionary: {
    title: string;
    subtitle: string;
    steps: {
      welcome: { title: string; description: string };
      explore: { title: string; description: string; action: string };
      book: { title: string; description: string; action: string };
      profile: { title: string; description: string; action: string };
      gamification: { title: string; description: string };
    };
    navigation: {
      next: string;
      previous: string;
      skip: string;
      finish: string;
      getStarted: string;
    };
  };
}

export function WelcomeOnboarding({ isOpen, onClose, dictionary }: WelcomeOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lang = (pathname?.split('/')[1] || 'en') as Locale;
  const { go } = useStableNavigation();

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: dictionary.steps.welcome.title,
      description: dictionary.steps.welcome.description,
      icon: Trophy,
    },
    {
      id: 'explore',
      title: dictionary.steps.explore.title,
      description: dictionary.steps.explore.description,
      icon: MapPin,
      action: {
        label: dictionary.steps.explore.action,
        href: `/${lang}/courses`,
      },
    },
    {
      id: 'book',
      title: dictionary.steps.book.title,
      description: dictionary.steps.book.description,
      icon: Calendar,
      action: {
        label: dictionary.steps.book.action,
        href: `/${lang}/courses`,
      },
    },
    {
      id: 'profile',
      title: dictionary.steps.profile.title,
      description: dictionary.steps.profile.description,
      icon: CheckCircle,
      action: {
        label: dictionary.steps.profile.action,
        href: `/${lang}/profile`,
      },
    },
    {
      id: 'gamification',
      title: dictionary.steps.gamification.title,
      description: dictionary.steps.gamification.description,
      icon: Trophy,
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    onClose();
    // Marcar el onboarding como completado en localStorage
    localStorage.setItem('onboarding-completed', 'true');
    // Redirigir a la página principal después del onboarding
    go(`/${lang}`);
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleActionClick = (href: string) => {
    onClose();
    go(href);
  };

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-primary">
                {dictionary.title}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {dictionary.subtitle}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Paso {currentStep + 1} de {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <IconComponent className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <CardDescription className="text-base">
                {currentStepData.description}
              </CardDescription>
            </CardHeader>
            
            {currentStepData.action && (
              <CardContent className="pt-0 text-center">
                <Button 
                  onClick={() => handleActionClick(currentStepData.action!.href)}
                  className="w-full sm:w-auto"
                >
                  {currentStepData.action.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            )}
          </Card>

          {/* User Info */}
          {userProfile && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    ¡Hola, {userProfile.displayName || 'Golfista'}!
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {userProfile.role === 'Customer' ? 'Miembro' : userProfile.role}
                    </Badge>
                    {userProfile.handicap && (
                      <Badge variant="outline" className="text-xs">
                        Handicap: {userProfile.handicap}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {dictionary.navigation.previous}
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                {dictionary.navigation.skip}
              </Button>
              <Button onClick={handleNext}>
                {currentStep === steps.length - 1 
                  ? dictionary.navigation.finish 
                  : dictionary.navigation.next
                }
                {currentStep < steps.length - 1 && (
                  <ArrowRight className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}