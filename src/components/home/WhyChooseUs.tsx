
import { Shield, Clock, Star, Phone, CreditCard, MapPin } from 'lucide-react';
import type { getDictionary } from '@/lib/get-dictionary';

interface WhyChooseUsProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['whyChooseUs'];
}

export function WhyChooseUs({ dictionary }: WhyChooseUsProps) {
    const features = [
      {
        icon: Clock,
        title: dictionary.features.realTime.title,
        description: dictionary.features.realTime.description,
      },
      {
        icon: Shield,
        title: dictionary.features.bestRate.title,
        description: dictionary.features.bestRate.description,
      },
      {
        icon: Star,
        title: dictionary.features.premium.title,
        description: dictionary.features.premium.description,
      },
      {
        icon: Phone,
        title: dictionary.features.support.title,
        description: dictionary.features.support.description,
      },
      {
        icon: CreditCard,
        title: dictionary.features.payment.title,
        description: dictionary.features.payment.description,
      },
      {
        icon: MapPin,
        title: dictionary.features.expertise.title,
        description: dictionary.features.expertise.description,
      }
    ];

    const stats = [
        { value: dictionary.stats.coursesValue, label: dictionary.stats.coursesLabel },
        { value: dictionary.stats.golfersValue, label: dictionary.stats.golfersLabel },
        { value: dictionary.stats.ratingValue, label: dictionary.stats.ratingLabel },
        { value: dictionary.stats.successRateValue, label: dictionary.stats.successRateLabel }
    ];

    return (
        <section className="py-16 lg:py-24 bg-muted/50 dark:bg-muted/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl font-bold text-primary md:text-4xl mb-4">
                {dictionary.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {dictionary.subtitle}
              </p>
            </div>
    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div
                    key={index}
                    className="text-center group hover:transform hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
    
            <div className="mt-16 border-t border-primary/20 pt-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {stats.map((stat, index) => (
                    <div key={index}>
                        <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                        <div className="text-sm text-background/80">{stat.label}</div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )
}
