'use client';

import dynamic from 'next/dynamic';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/lib/types';
import { golfCourses } from '@/lib/data/golf-courses';
import type { MarkerData } from '@/components/map/TRMap';

// Dynamically import TRMap to avoid SSR issues
const TRMap = dynamic(() => import('@/components/map/TRMap'), {
  loading: () => (
    <div className="w-full h-96 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Cargando mapa...</div>
    </div>
  ),
});

interface PageProps {
  params: { lang: Locale };
}

export default function MapDemoPage({ params }: PageProps) {
  // For client components, we'll use a simple dictionary or fetch it with useEffect
  const dict = {
    map: {
      demo: 'Map Demo',
      demoDescription: 'Interactive map demo showcasing golf courses in Los Cabos'
    }
  };
  
  // Los Cabos center coordinates
  const losCabosCenter = { lat: 22.8905, lng: -109.9167 };
  
  // Convert golf courses to marker data format
  const allCourseMarkers: MarkerData[] = golfCourses.map(course => ({
    id: course.id,
    name: course.name,
    lat: course.lat,
    lng: course.lng,
    description: course.description,
    priceFromUSD: course.priceFromUSD,
    url: course.url,
  }));

  const singleMarker = [{
    id: 'cabo-del-sol',
    name: 'Cabo del Sol Golf Club',
    lat: 22.8905,
    lng: -109.9167,
    description: 'Championship golf course with ocean views',
  }];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {dict.map?.demo || 'TRMap Component Demo'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dict.map?.demoDescription || 'Explore the interactive map features powered by OpenStreetMap and Leaflet'}
          </p>
        </div>

        <div className="space-y-12">
          {/* Basic Map */}
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Basic Map
            </h2>
            <p className="text-gray-600 mb-6">
              Simple map centered on Los Cabos with default zoom level.
            </p>
            <TRMap
              center={[losCabosCenter.lat, losCabosCenter.lng]}
              zoom={12}
              height="384px"
            />
          </section>

          {/* Map with Single Marker */}
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Map with Single Marker
            </h2>
            <p className="text-gray-600 mb-6">
              Map displaying a single golf course marker with popup information.
            </p>
            <TRMap
              center={[losCabosCenter.lat, losCabosCenter.lng]}
              zoom={13}
              markers={singleMarker}
              height="384px"
            />
          </section>

          {/* Map with Multiple Markers */}
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Map with Multiple Markers
            </h2>
            <p className="text-gray-600 mb-6">
              Map showing all golf courses in Los Cabos with clustering enabled.
            </p>
            <TRMap
              center={[losCabosCenter.lat, losCabosCenter.lng]}
              zoom={11}
              markers={allCourseMarkers}
              cluster={true}
              height="384px"
            />
          </section>

          {/* Interactive Map with User Location */}
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Interactive Map with User Location
            </h2>
            <p className="text-gray-600 mb-6">
              Map with user location detection and marker clustering enabled.
            </p>
            <TRMap
              center={[losCabosCenter.lat, losCabosCenter.lng]}
              zoom={12}
              markers={allCourseMarkers}
              showUserLocation={true}
              cluster={true}
              height="384px"
            />
          </section>

          {/* Compact Map */}
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Compact Map
            </h2>
            <p className="text-gray-600 mb-6">
              Smaller map perfect for contact pages or sidebars.
            </p>
            <div className="max-w-md mx-auto">
              <TRMap
                center={[losCabosCenter.lat, losCabosCenter.lng]}
                zoom={14}
                markers={singleMarker}
                height="256px"
              />
            </div>
          </section>

          {/* Features Overview */}
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              TRMap Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">🗺️ OpenStreetMap</h3>
                <p className="text-gray-600 text-sm">
                  Powered by OpenStreetMap data with no API key required.
                </p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">📍 Custom Markers</h3>
                <p className="text-gray-600 text-sm">
                  Support for custom markers with popups and descriptions.
                </p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">🔍 Geocoding Ready</h3>
                <p className="text-gray-600 text-sm">
                  Ready for search functionality using Nominatim geocoding.
                </p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">📱 User Location</h3>
                <p className="text-gray-600 text-sm">
                  Optional user location detection and display.
                </p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">🎯 Clustering</h3>
                <p className="text-gray-600 text-sm">
                  Automatic marker clustering for better performance.
                </p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">🎨 Responsive</h3>
                <p className="text-gray-600 text-sm">
                  Fully responsive design that works on all devices.
                </p>
              </div>
            </div>
          </section>

          {/* Code Example */}
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Usage Example
            </h2>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`import TRMap from '@/components/map/TRMap';

const markers = [
  {
    id: 'course-1',
    name: 'Golf Course',
    lat: 22.8905,
    lng: -109.9167,
    description: 'Beautiful golf course'
  }
];

<TRMap
  center={[22.8905, -109.9167]}
  zoom={12}
  markers={markers}
  showUserLocation={true}
  cluster={true}
  height="384px"
/>`}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}