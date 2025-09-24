import { MarkerData } from '@/components/map/TRMap';

// Datos de muestra de campos de golf en Los Cabos
export const sampleGolfCourses: MarkerData[] = [
  {
    id: 'palmilla-golf-club',
    name: 'Palmilla Golf Club',
    lat: 23.0463,
    lng: -109.7129,
    description: 'Campo de golf de clase mundial diseñado por Jack Nicklaus con vistas espectaculares al Mar de Cortés.',
    imageUrl: '/images/courses/palmilla.jpg',
    priceFromUSD: 280,
    url: '/courses/palmilla-golf-club'
  },
  {
    id: 'cabo-real-golf-club',
    name: 'Cabo Real Golf Club',
    lat: 22.9971,
    lng: -109.7772,
    description: 'Diseñado por Robert Trent Jones Jr., este campo ofrece una experiencia única con hoyos junto al océano.',
    imageUrl: '/images/courses/cabo-real.jpg',
    priceFromUSD: 220,
    url: '/courses/cabo-real-golf-club'
  },
  {
    id: 'puerto-los-cabos',
    name: 'Puerto Los Cabos Golf Club',
    lat: 23.0740,
    lng: -109.5911,
    description: 'Campo de campeonato diseñado por Jack Nicklaus con dos campos distintos: Marina y Mission.',
    imageUrl: '/images/courses/puerto-los-cabos.jpg',
    priceFromUSD: 195,
    url: '/courses/puerto-los-cabos'
  },
  {
    id: 'cabo-del-sol-ocean',
    name: 'Cabo del Sol - Ocean Course',
    lat: 22.9488,
    lng: -109.8232,
    description: 'Diseñado por Jack Nicklaus, considerado uno de los mejores campos de golf del mundo con vistas al Pacífico.',
    imageUrl: '/images/courses/cabo-del-sol-ocean.jpg',
    priceFromUSD: 350,
    url: '/courses/cabo-del-sol-ocean'
  },
  {
    id: 'cabo-del-sol-desert',
    name: 'Cabo del Sol - Desert Course',
    lat: 22.9455,
    lng: -109.8198,
    description: 'Campo desértico diseñado por Tom Weiskopf que ofrece un desafío único en el paisaje de Baja California.',
    imageUrl: '/images/courses/cabo-del-sol-desert.jpg',
    priceFromUSD: 280,
    url: '/courses/cabo-del-sol-desert'
  },
  {
    id: 'club-campestre-san-lucas',
    name: 'Club Campestre San Lucas',
    lat: 22.9107,
    lng: -109.9297,
    description: 'Campo tradicional mexicano con un diseño que respeta el entorno natural del desierto de Sonora.',
    imageUrl: '/images/courses/campestre-san-lucas.jpg',
    priceFromUSD: 120,
    url: '/courses/club-campestre-san-lucas'
  },
  {
    id: 'solmar-golf-links',
    name: 'Solmar Golf Links',
    lat: 22.8941,
    lng: -109.9669,
    description: 'Campo links auténtico en el extremo de la península con vistas dramáticas al Arco de Cabo San Lucas.',
    imageUrl: '/images/courses/solmar-golf-links.jpg',
    priceFromUSD: 160,
    url: '/courses/solmar-golf-links'
  },
  {
    id: 'querencia-golf-club',
    name: 'Querencia Golf Club',
    lat: 22.9823,
    lng: -109.7445,
    description: 'Campo privado diseñado por Tom Fazio, conocido por su diseño desafiante y vistas panorámicas.',
    imageUrl: '/images/courses/querencia.jpg',
    priceFromUSD: 450,
    url: '/courses/querencia-golf-club'
  },
  {
    id: 'chileno-bay-golf',
    name: 'Chileno Bay Golf & Beach Club',
    lat: 22.9654,
    lng: -109.7889,
    description: 'Campo boutique diseñado por Tom Fazio con acceso exclusivo a la playa de Chileno Bay.',
    imageUrl: '/images/courses/chileno-bay.jpg',
    priceFromUSD: 380,
    url: '/courses/chileno-bay-golf'
  },
  {
    id: 'costa-palmas',
    name: 'Costa Palmas Golf Club',
    lat: 23.4567,
    lng: -109.4321,
    description: 'Nuevo desarrollo de lujo con campo diseñado por Robert Trent Jones Jr. en la Costa Este.',
    imageUrl: '/images/courses/costa-palmas.jpg',
    priceFromUSD: 320,
    url: '/courses/costa-palmas'
  },
  {
    id: 'ventanas-golf',
    name: 'Ventanas Golf Course',
    lat: 22.9234,
    lng: -109.8567,
    description: 'Campo ejecutivo perfecto para principiantes y jugadores que buscan una ronda rápida.',
    imageUrl: '/images/courses/ventanas.jpg',
    priceFromUSD: 85,
    url: '/courses/ventanas-golf'
  },
  {
    id: 'diamante-dunes',
    name: 'Diamante Dunes Course',
    lat: 22.8765,
    lng: -109.9123,
    description: 'Campo links diseñado por Davis Love III con dunas naturales y vistas al Pacífico.',
    imageUrl: '/images/courses/diamante-dunes.jpg',
    priceFromUSD: 240,
    url: '/courses/diamante-dunes'
  },
  {
    id: 'diamante-el-cardonal',
    name: 'Diamante El Cardonal',
    lat: 22.8798,
    lng: -109.9087,
    description: 'Campo diseñado por Tiger Woods, su primera creación en México con características únicas.',
    imageUrl: '/images/courses/diamante-el-cardonal.jpg',
    priceFromUSD: 290,
    url: '/courses/diamante-el-cardonal'
  },
  {
    id: 'rancho-san-lucas',
    name: 'Rancho San Lucas Golf Club',
    lat: 22.8432,
    lng: -109.9876,
    description: 'Campo diseñado por Greg Norman en un entorno desértico espectacular con vistas panorámicas.',
    imageUrl: '/images/courses/rancho-san-lucas.jpg',
    priceFromUSD: 310,
    url: '/courses/rancho-san-lucas'
  },
  {
    id: 'vidanta-golf',
    name: 'Vidanta Golf Los Cabos',
    lat: 22.9876,
    lng: -109.7234,
    description: 'Campo resort diseñado por Greg Norman como parte del complejo Vidanta Los Cabos.',
    imageUrl: '/images/courses/vidanta.jpg',
    priceFromUSD: 180,
    url: '/courses/vidanta-golf'
  }
];

// Función helper para obtener cursos por región
export const getCoursesByRegion = (region: 'cabo-san-lucas' | 'san-jose' | 'corridor' | 'east-cape') => {
  const regionMap = {
    'cabo-san-lucas': ['solmar-golf-links', 'club-campestre-san-lucas', 'diamante-dunes', 'diamante-el-cardonal', 'rancho-san-lucas'],
    'san-jose': ['puerto-los-cabos', 'costa-palmas'],
    'corridor': ['palmilla-golf-club', 'cabo-real-golf-club', 'cabo-del-sol-ocean', 'cabo-del-sol-desert', 'querencia-golf-club', 'chileno-bay-golf', 'ventanas-golf', 'vidanta-golf'],
    'east-cape': ['costa-palmas']
  };

  return sampleGolfCourses.filter(course => regionMap[region].includes(course.id));
};

// Función helper para obtener cursos por rango de precio
export const getCoursesByPriceRange = (minPrice: number, maxPrice: number) => {
  return sampleGolfCourses.filter(course => 
    course.priceFromUSD && course.priceFromUSD >= minPrice && course.priceFromUSD <= maxPrice
  );
};

// Función helper para buscar cursos por nombre
export const searchCoursesByName = (searchTerm: string) => {
  const term = searchTerm.toLowerCase();
  return sampleGolfCourses.filter(course => 
    course.name.toLowerCase().includes(term) || 
    course.description?.toLowerCase().includes(term)
  );
};

// Adapter para futura integración con base de datos
export interface CourseDataAdapter {
  getAllCourses(): Promise<MarkerData[]>;
  getCourseById(id: string): Promise<MarkerData | null>;
  getCoursesByRegion(region: string): Promise<MarkerData[]>;
  searchCourses(query: string): Promise<MarkerData[]>;
}

// Implementación mock del adapter
export class MockCourseAdapter implements CourseDataAdapter {
  async getAllCourses(): Promise<MarkerData[]> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 100));
    return sampleGolfCourses;
  }

  async getCourseById(id: string): Promise<MarkerData | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return sampleGolfCourses.find(course => course.id === id) || null;
  }

  async getCoursesByRegion(region: string): Promise<MarkerData[]> {
    await new Promise(resolve => setTimeout(resolve, 75));
    return getCoursesByRegion(region as any);
  }

  async searchCourses(query: string): Promise<MarkerData[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return searchCoursesByName(query);
  }
}

export default sampleGolfCourses;