import { getCourses } from '@/lib/data';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/i18n-config';
import { MapPageClient } from '@/components/map/MapPageClient';
import type { Metadata } from 'next';

interface MapPageProps {
  params: Promise<{ lang: Locale }>;
}

// Generar metadata SEO para la página de mapa
export async function generateMetadata({ params: paramsProp }: MapPageProps): Promise<Metadata> {
  const params = await paramsProp;
  const lang = params.lang;
  
  const title = lang === 'es' 
    ? 'Mapa de Campos de Golf - TeeReserve Golf Los Cabos'
    : 'Golf Courses Map - TeeReserve Golf Los Cabos';
    
  const description = lang === 'es'
    ? 'Explora todos los campos de golf en Los Cabos en nuestro mapa interactivo. Encuentra ubicaciones, precios y reserva directamente.'
    : 'Explore all golf courses in Los Cabos on our interactive map. Find locations, prices and book directly.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function MapPage({ params: paramsProp }: MapPageProps) {
  const params = await paramsProp;
  const lang = params.lang;
  
  // Obtener datos de los campos y diccionario
  const [courses, dictionary] = await Promise.all([
    getCourses({}),
    getDictionary(lang)
  ]);

  // Filtrar solo los campos que tienen coordenadas
  const coursesWithCoordinates = courses.filter(course => course.latLng);

  return (
    <div className="min-h-screen bg-background/70 backdrop-blur-sm relative">
      {/* Imagen de fondo hero */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: 'url(/hero-3.jpg)',
          backgroundAttachment: 'fixed'
        }}
      />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 text-center bg-background/80 backdrop-blur-md rounded-lg p-6">
          <h1 className="text-4xl font-bold text-primary mb-4">
            {lang === 'es' ? 'Conoce los campos de Golf de todo México' : 'Discover Golf Courses Across Mexico'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {lang === 'es' 
              ? 'Explora todos nuestros campos de golf en un mapa interactivo. Haz clic en cualquier pin para ver más información y reservar.'
              : 'Explore all our golf courses on an interactive map. Click on any pin to see more information and book.'
            }
          </p>
        </div>

        <div className="bg-card/90 backdrop-blur-md rounded-lg shadow-lg overflow-hidden">
          <MapPageClient 
            courses={coursesWithCoordinates}
            lang={lang}
            dictionary={dictionary}
          />
        </div>

        {/* Información adicional */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-card/80 backdrop-blur-md rounded-lg">
            <h3 className="text-xl font-semibold text-primary mb-2">
              {coursesWithCoordinates.length}
            </h3>
            <p className="text-muted-foreground">
              {lang === 'es' ? 'Campos Disponibles' : 'Available Courses'}
            </p>
          </div>
          <div className="text-center p-6 bg-card/80 backdrop-blur-md rounded-lg">
            <h3 className="text-xl font-semibold text-primary mb-2">
              {lang === 'es' ? 'Los Cabos' : 'Los Cabos'}
            </h3>
            <p className="text-muted-foreground">
              {lang === 'es' ? 'Ubicación Principal' : 'Main Location'}
            </p>
          </div>
          <div className="text-center p-6 bg-card/80 backdrop-blur-md rounded-lg">
            <h3 className="text-xl font-semibold text-primary mb-2">
              {lang === 'es' ? 'Reserva Fácil' : 'Easy Booking'}
            </h3>
            <p className="text-muted-foreground">
              {lang === 'es' ? 'Proceso Simplificado' : 'Simplified Process'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}