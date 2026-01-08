export interface GolfCourse {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  imageUrl?: string;
  priceFromUSD?: number;
  url?: string;
}

export const golfCourses: GolfCourse[] = [
  {
    id: 'cabo-del-sol-ocean',
    name: 'Cabo del Sol Ocean Course',
    lat: 22.8905,
    lng: -109.9167,
    description: 'Championship golf course with stunning ocean views designed by Jack Nicklaus.',
    priceFromUSD: 250,
    url: '/courses/cabo-del-sol-ocean'
  },
  {
    id: 'cabo-del-sol-desert',
    name: 'Cabo del Sol Desert Course',
    lat: 22.8895,
    lng: -109.9157,
    description: 'Desert course designed by Tom Weiskopf with dramatic mountain backdrops.',
    priceFromUSD: 200,
    url: '/courses/cabo-del-sol-desert'
  },
  {
    id: 'palmilla-golf',
    name: 'Palmilla Golf Club',
    lat: 22.8825,
    lng: -109.8975,
    description: 'Robert Trent Jones Jr. designed course with ocean and mountain views.',
    priceFromUSD: 300,
    url: '/courses/palmilla-golf'
  },
  {
    id: 'esperanza-golf',
    name: 'Esperanza Golf Club',
    lat: 22.8755,
    lng: -109.8855,
    description: 'Tom Doak designed course offering spectacular Sea of Cortez views.',
    priceFromUSD: 275,
    url: '/courses/esperanza-golf'
  },
  {
    id: 'chileno-bay-golf',
    name: 'Chileno Bay Golf & Beach Club',
    lat: 22.8685,
    lng: -109.8735,
    description: 'TPC course designed by Tom Fazio with pristine beachfront location.',
    priceFromUSD: 350,
    url: '/courses/chileno-bay-golf'
  },
  {
    id: 'quivira-golf',
    name: 'Quivira Golf Club',
    lat: 22.8615,
    lng: -109.8615,
    description: 'Jack Nicklaus Signature course with dramatic cliffside holes.',
    priceFromUSD: 400,
    url: '/courses/quivira-golf'
  }
];