'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { seedReviews } from '@/lib/seed-reviews';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  const handleSeedReviews = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    setMessage('');

    try {
      await seedReviews();
      setSeedResult('success');
      setMessage('Reseñas de ejemplo agregadas exitosamente!');
    } catch (error) {
      setSeedResult('error');
      setMessage(`Error al agregar reseñas: ${error}`);
      console.error('Error seeding reviews:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Herramientas de Desarrollo</h1>
        <p className="text-muted-foreground mt-2">
          Herramientas para poblar la base de datos con datos de ejemplo
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sembrar Reseñas de Ejemplo</CardTitle>
            <CardDescription>
              Agrega reseñas de ejemplo aprobadas para mostrar en la sección "Lo Que Dicen Nuestros Golfistas"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSeedReviews} 
              disabled={isSeeding}
              className="w-full"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Agregando reseñas...
                </>
              ) : (
                'Agregar Reseñas de Ejemplo'
              )}
            </Button>

            {seedResult && (
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                seedResult === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {seedResult === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{message}</span>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p><strong>Nota:</strong> Esta herramienta agregará 6 reseñas de ejemplo aprobadas a los primeros 3 campos de golf.</p>
              <p>Las reseñas tendrán calificaciones de 4-5 estrellas y aparecerán en la sección destacada de la página principal.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}