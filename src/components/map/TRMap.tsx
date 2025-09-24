'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Tipos de datos
export type MarkerData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  imageUrl?: string;
  priceFromUSD?: number;
  url?: string; // link a la ficha del campo
};

export type TRMapProps = {
  center?: [number, number];    // default: [22.8909, -109.9124] (Cabo San Lucas)
  zoom?: number;                // default: 12
  markers?: MarkerData[];       // lista de campos
  fitToMarkers?: boolean;       // default: true
  showUserLocation?: boolean;   // default: true
  cluster?: boolean;            // default: true
  height?: string;              // default: '500px'
  tileProvider?: 'osm' | 'mapbox'; // default: 'osm'
};

// Componente interno que usa las librerías de Leaflet
const TRMapComponent: React.FC<TRMapProps> = ({
  center = [22.8909, -109.9124],
  zoom = 12,
  markers = [],
  fitToMarkers = true,
  showUserLocation = true,
  cluster = true,
  height = '500px',
  tileProvider = 'osm'
}) => {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [leafletComponents, setLeafletComponents] = useState<any>(null);
  const [L, setL] = useState<any>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        // Importar las librerías de Leaflet dinámicamente
        const [leafletModule, reactLeafletModule] = await Promise.all([
          import('leaflet'),
          import('react-leaflet')
        ]);

        // Importar CSS de Leaflet
        await import('leaflet/dist/leaflet.css');
        
        // Importar plugins adicionales
        await import('leaflet.markercluster');
        await import('leaflet-control-geocoder');

        setL(leafletModule.default);
        setLeafletComponents(reactLeafletModule);
        setLeafletLoaded(true);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    loadLeaflet();
  }, []);

  // Configurar geolocalización
  useEffect(() => {
    if (!showUserLocation || !leafletLoaded) return;

    if (!navigator.geolocation) {
      console.warn('La geolocalización no está soportada en este navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
      },
      (err) => {
        console.warn('No se pudo obtener tu ubicación. Verifica los permisos.', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  }, [showUserLocation, leafletLoaded]);

  // Crear icono personalizado
  const createCustomIcon = (color: 'gold' | 'green' | 'blue' = 'gold') => {
    if (!L) return null;

    const colors = {
      gold: '#CED46A',
      green: '#07553B',
      blue: '#3B82F6'
    };

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${colors[color]};
          width: 25px;
          height: 25px;
          border-radius: 50% 50% 50% 0;
          border: 2px solid white;
          transform: rotate(-45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
            position: absolute;
            top: 6px;
            left: 6px;
          "></div>
        </div>
      `,
      iconSize: [25, 25],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24]
    });
  };

  // Configurar bounds del mapa
  const bounds = useMemo(() => {
    if (!L || !fitToMarkers || markers.length === 0) return null;
    
    const latLngs = markers.map(marker => [marker.lat, marker.lng] as [number, number]);
    if (position) {
      latLngs.push(position);
    }
    
    return L.latLngBounds(latLngs);
  }, [L, markers, position, fitToMarkers]);

  // Mostrar loading mientras se carga Leaflet
  if (!leafletLoaded || !leafletComponents || !L) {
    return (
      <div 
        className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, CircleMarker } = leafletComponents;

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg" style={{ height }}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Marcadores de campos de golf */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createCustomIcon('gold')}
          >
            <Popup>
              <div className="max-w-xs">
                {marker.imageUrl && (
                  <img 
                    src={marker.imageUrl} 
                    alt={marker.name}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <h3 className="font-bold text-lg text-gray-800 mb-1">
                  {marker.name}
                </h3>
                {marker.description && (
                  <p className="text-gray-600 text-sm mb-2">
                    {marker.description}
                  </p>
                )}
                {marker.priceFromUSD && (
                  <p className="text-green-600 font-semibold mb-2">
                    Desde ${marker.priceFromUSD} USD
                  </p>
                )}
                <div className="flex gap-2">
                  {marker.url && (
                    <a
                      href={marker.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Ver detalles
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`;
                      window.open(url, '_blank');
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Cómo llegar
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marcador de ubicación del usuario */}
        {showUserLocation && position && (
          <>
            <CircleMarker
              center={position}
              radius={20}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.2,
                weight: 2
              }}
            />
            <Marker position={position} icon={createCustomIcon('blue')}>
              <Popup>
                <div className="text-center">
                  <strong>Estás aquí</strong>
                  <br />
                  <small>Ubicación actual</small>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
};

// Exportar con dynamic para evitar errores de SSR
const TRMap = dynamic(() => Promise.resolve(TRMapComponent), {
  ssr: false,
  loading: () => (
    <div 
      className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
      style={{ height: '500px' }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-2"></div>
        <p className="text-gray-600">Cargando mapa...</p>
      </div>
    </div>
  )
});

export default TRMap;