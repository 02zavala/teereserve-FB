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
  const [L, setL] = useState<any>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    let isMounted = true;
    
    const loadLeaflet = async () => {
      try {
        // Importar solo Leaflet (sin react-leaflet)
        const leafletModule = await import('leaflet');

        // Inyectar CSS de Leaflet (evitar error de tipos en import)
        if (typeof document !== 'undefined' && !document.querySelector('link[data-leaflet-css]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.setAttribute('data-leaflet-css', 'true');
          document.head.appendChild(link);
        }
        
        // Importar plugins adicionales
        await import('leaflet.markercluster');
        await import('leaflet-control-geocoder');

        // Solo actualizar el estado si el componente sigue montado
        if (isMounted) {
          setL(leafletModule.default);
          setLeafletLoaded(true);
        }
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    loadLeaflet();

    // Cleanup function
    return () => {
      isMounted = false;
      // Limpiar el mapa si existe
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          // Ignorar errores de cleanup
        }
      }
    };
  }, []);

  // Crear el mapa manualmente cuando Leaflet esté cargado
  useEffect(() => {
    if (!leafletLoaded || !L || !containerRef.current) return;

    // Verificar que el contenedor esté en el DOM y no tenga un mapa ya inicializado
    const container = containerRef.current;
    if (!container || !container.parentNode) return;
    
    // Verificar si el contenedor ya tiene un mapa inicializado
    if (mapInstanceRef.current) {
      return;
    }

    // Si ya existe un mapa, no crear otro
    if (mapInstanceRef.current) return;

    try {
      // Limpiar cualquier contenido previo del contenedor
      container.innerHTML = '';
      
      // Crear el mapa
      const map = L.map(container, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        attributionControl: true
      });

      // Agregar capa de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    } catch (error) {
      console.error('Error creating map:', error);
      // Si hay error, limpiar referencias
      mapInstanceRef.current = null;
    }
  }, [leafletLoaded, L, center, zoom]);

  // Manejar marcadores
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;

    // Limpiar marcadores existentes (excepto el de usuario)
    markersRef.current.forEach(marker => {
      if (!marker.options.isUserMarker) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = markersRef.current.filter(marker => marker.options.isUserMarker);

    // Agregar nuevos marcadores
    markers.forEach(markerData => {
      try {
        const customIcon = createCustomIcon('gold');
        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: customIcon,
          isUserMarker: false
        });
        
        // Crear popup rico si hay datos
        if (markerData.name) {
          const popupContent = `
            <div style="max-width: 250px;">
              ${markerData.imageUrl ? `<img src="${markerData.imageUrl}" alt="${markerData.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ''}
              <h3 style="font-weight: bold; font-size: 16px; color: #1f2937; margin-bottom: 4px;">
                ${markerData.name || 'Campo de Golf'}
              </h3>
              ${markerData.description ? `<p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${markerData.description}</p>` : ''}
              ${markerData.priceFromUSD ? `<p style="color: #059669; font-weight: 600; margin-bottom: 8px;">Desde $${markerData.priceFromUSD} USD</p>` : ''}
              <div style="display: flex; gap: 8px;">
                ${markerData.url ? `<a href="${markerData.url}" target="_blank" style="background: #f59e0b; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">Ver detalles</a>` : ''}
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${markerData.lat},${markerData.lng}', '_blank')" style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px;">Cómo llegar</button>
              </div>
            </div>
          `;
          marker.bindPopup(popupContent);
        }
        
        marker.addTo(mapInstanceRef.current);
        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error adding marker:', error);
      }
    });

    // Ajustar vista si es necesario
    if (fitToMarkers && markers.length > 0) {
      try {
        const group = new L.featureGroup(markersRef.current.filter(m => !m.options.isUserMarker));
        if (group.getLayers().length > 0) {
          mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [markers, fitToMarkers, L]);

  // Configurar geolocalización
  useEffect(() => {
    if (!showUserLocation || !leafletLoaded) return;

    if (!navigator.geolocation) {
      console.warn('La geolocalización no está soportada en este navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(userPosition);
        
        // Agregar marcador de usuario al mapa si está disponible
          if (mapInstanceRef.current && L) {
            try {
              const userMarker = L.marker(userPosition, {
                icon: L.divIcon({
                  className: 'user-location-marker',
                  html: '<div style="background: #3B82F6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                }),
                isUserMarker: true
              });
              
              userMarker.bindPopup('<div style="text-align: center;"><strong>Estás aquí</strong><br><small>Ubicación actual</small></div>');
              userMarker.addTo(mapInstanceRef.current);
              markersRef.current.push(userMarker);
            } catch (error) {
              console.error('Error adding user marker:', error);
            }
          }
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
  }, [showUserLocation, leafletLoaded, L]);

  // Crear icono personalizado
  const createCustomIcon = (type: 'golf' | 'user' | 'gold' | 'blue' = 'golf') => {
    if (!L) return null;
    
    const colors = {
      golf: '#10B981', // Verde
      user: '#3B82F6', // Azul
      gold: '#F59E0B', // Dorado
      blue: '#3B82F6'  // Azul
    };

    const color = colors[type] || colors.golf;

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">
          ${type === 'golf' || type === 'gold' ? '⛳' : type === 'user' || type === 'blue' ? '📍' : '📍'}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
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
  if (!leafletLoaded) {
    return (
      <div className="w-full flex justify-center" style={{ height }}>
        <div 
          className="bg-gray-100 rounded-lg flex items-center justify-center"
          style={{ height: '100%', width: '90%' }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center" style={{ height }}>
      <div className="rounded-lg overflow-hidden shadow-lg" style={{ height: '100%', width: '90%' }}>
        <div
          ref={containerRef}
          style={{ 
            height: '100%', 
            width: '100%'
          }}
        />
      </div>
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
