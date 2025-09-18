
import * as React from 'react';
import { recommendGolfCourses } from '@/ai/flows/recommend-golf-courses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MapPin, Star, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/i18n-config';


interface RecommendationsPageProps {
  params: Promise<{ lang: Locale }>;
}

export default async function AIRecommendationsPage({ params: paramsProp }: RecommendationsPageProps) {
  const params = await paramsProp;
  const dictionary = await getDictionary(params.lang);
  const t = dictionary.recommendationsPage;
  let recommendations: any[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'anonymous-user-dynamic',
        location: 'Los Cabos',
        numPlayers: 2,
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      recommendations = result.recommendations || [];
    } else {
      throw new Error(result.error || 'Failed to get recommendations');
    }
  } catch (err) {
    console.error("Failed to fetch AI recommendations:", err);
    error = t.error.message;
  }

  if (error) {
    return (
      <>
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t.error.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button asChild variant="outline">
                <Link href={`/${params.lang}/recommendations`}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.tryAgain}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

      </>
    );
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-12">
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-3 font-headline text-3xl text-primary">
                <Sparkles className="h-8 w-8" />
                {t.title}
              </CardTitle>
               <Button asChild variant="outline">
                 <Link href={`/${params.lang}/recommendations`}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.refresh}
                </Link>
              </Button>
            </div>
            <CardDescription className="text-primary/80">
              {t.subtitle.replace('{count}', recommendations.length.toString())}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <Card key={rec.courseId} className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="md:flex">
                  <div className="md:w-1/3 relative">
                    <Image
                      src={rec.imageUrl}
                      alt={rec.name}
                      width={400}
                      height={400}
                      data-ai-hint="golf course aerial"
                      className="object-cover w-full h-56 md:h-full"
                    />
                     <div className="absolute top-3 left-3">
                      <Badge className="bg-primary text-primary-foreground">
                        #{index + 1} {t.recommendationBadge}
                      </Badge>
                    </div>
                  </div>

                  <div className="md:w-2/3 p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <CardTitle className="font-headline text-2xl text-primary mb-1">
                          {rec.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                           <MapPin className="h-4 w-4" />
                           <span className="text-sm">{rec.location || 'Los Cabos'}</span>
                        </div>
                      </div>
                       <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-2xl font-bold text-accent">
                          ${rec.price}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t.perPlayer}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-foreground/80 mb-4 text-sm">{rec.description}</p>
                    
                    <div className="bg-card border rounded-lg p-3 mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            {t.greatMatch}
                        </h4>
                         <p className="text-xs text-muted-foreground">{rec.reason}</p>
                    </div>

                    {rec.tags && rec.tags.length > 0 && (
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                                {rec.tags.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                    {tag}
                                </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                      <Button asChild className="flex-1">
                        <Link href={`/${params.lang}/courses/${rec.courseId}`}>
                           {t.bookNow}
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                         <Link href={`/${params.lang}/courses/${rec.courseId}`}>
                            {t.viewDetails}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
             <Card>
                <CardContent className="text-center py-16">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                        {t.noRecs.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t.noRecs.subtitle}
                    </p>
                    <Button asChild variant="outline">
                        <Link href={`/${params.lang}/recommendations`}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t.refresh}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
          )}
        </div>
      </div>
 
    </div>
  );
}
