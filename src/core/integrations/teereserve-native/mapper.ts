import type { GolfCourse, TeeTime } from '@/types/index'

export function mapCourse(docId: string, data: any): GolfCourse {
  return {
    id: docId,
    name: data.name,
    location: data.location,
    address: data.address,
    description: data.description,
    rules: data.rules,
    basePrice: data.basePrice,
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
    slug: data.slug,
    hidden: !!data.hidden,
    isFeatured: !!data.isFeatured,
    latLng: data.latLng,
    teeTimeInterval: data.teeTimeInterval,
    operatingHours: data.operatingHours,
    availableHoles: Array.isArray(data.availableHoles) ? data.availableHoles : [],
    totalYards: data.totalYards,
    par: data.par,
    holeDetails: data.holeDetails,
    translations: data.translations,
    reviews: [],
  }
}

export function mapTeeTime(docId: string, data: any): TeeTime {
  return {
    id: docId,
    date: data.date,
    time: data.time,
    status: data.status || 'available',
    price: typeof data.price === 'number' ? data.price : 0,
    maxPlayers: data.maxPlayers,
    bookedPlayers: data.bookedPlayers,
    availableSpots: data.availableSpots,
    bookingIds: data.bookingIds,
  }
}