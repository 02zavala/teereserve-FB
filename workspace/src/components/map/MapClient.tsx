'use client';

import dynamic from 'next/dynamic';

const TRMap = dynamic(() => import('@/components/map/TRMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse rounded-xl" />
});

interface MapClientProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    description?: string;
    imageUrl?: string;
    priceFromUSD?: number;
    url?: string;
  }>;
  className?: string;
  showUserLocation?: boolean;
  showSearch?: boolean;
  clustering?: boolean;
}

export default function MapClient(props: MapClientProps) {
  // Default props for Los Cabos contact page
  const defaultProps = {
    center: [22.8909, -109.9124] as [number, number],
    zoom: 12,
    markers: [{
      id: 'los-cabos-office',
      name: 'TeeReserve Los Cabos',
      lat: 22.8909,
      lng: -109.9124,
      description: 'Oficina principal en Los Cabos'
    }],
    className: "w-full h-full rounded-xl",
    showUserLocation: true,
    showSearch: false,
    clustering: false
  };

  const finalProps = { ...defaultProps, ...props };

  return (
    <TRMap
      center={finalProps.center}
      zoom={finalProps.zoom}
      markers={finalProps.markers}
      showUserLocation={finalProps.showUserLocation}
      cluster={finalProps.clustering}
      height="400px"
    />
  );
}