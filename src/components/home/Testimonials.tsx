
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { getDictionary } from '@/lib/get-dictionary'

type Dictionary = Awaited<ReturnType<typeof getDictionary>>['testimonials'];

interface TestimonialsProps {
    dictionary: Dictionary
}


export function Testimonials({ dictionary }: TestimonialsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const testimonials = dictionary.testimonials;

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, testimonials.length])

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
    )
  }

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    )
  }

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl font-bold text-primary md:text-4xl mb-4">
            {dictionary.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {dictionary.subtitle}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-background">
            <CardContent className="p-8 md:p-12">
              <div className="text-center">
                <Quote className="h-12 w-12 text-primary mx-auto mb-6" />

                <div className="flex justify-center mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-primary text-primary"
                    />
                  ))}
                </div>

                <blockquote className="text-xl md:text-2xl text-foreground/80 leading-relaxed mb-8 italic">
                  "{testimonials[currentIndex].comment}"
                </blockquote>

                <div className="flex items-center justify-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={testimonials[currentIndex].avatar}
                      alt={testimonials[currentIndex].name}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {testimonials[currentIndex].name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-left">
                    <div className="font-semibold text-foreground text-lg">
                      {testimonials[currentIndex].name}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {testimonials[currentIndex].location}
                    </div>
                    <div className="text-primary text-sm font-medium">
                      Played at {testimonials[currentIndex].course}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center mt-8 space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex space-x-2">
              {testimonials.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  onMouseEnter={() => setIsAutoPlaying(false)}
                  onMouseLeave={() => setIsAutoPlaying(true)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
