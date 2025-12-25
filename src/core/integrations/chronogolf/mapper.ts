import type { GolfCourse, TeeTime, Booking } from '@/types'

export function mapCourseFromChronogolf(src: any): GolfCourse {
  return {
    id: String(src.id ?? src.uuid ?? ''),
    name: String(src.name ?? ''),
    location: String(src.location ?? src.city ?? ''),
    description: String(src.description ?? ''),
    rules: String(src.rules ?? ''),
    basePrice: Number(src.basePrice ?? src.price ?? 0),
    imageUrls: Array.isArray(src.images) ? src.images : [],
    slug: src.slug ?? undefined,
    hidden: Boolean(src.hidden ?? false),
    isFeatured: Boolean(src.isFeatured ?? false),
    latLng: src.lat && src.lng ? { lat: Number(src.lat), lng: Number(src.lng) } : undefined,
    teeTimeInterval: Number(src.teeTimeInterval ?? 10),
    operatingHours: src.operatingHours ?? undefined,
    availableHoles: Array.isArray(src.availableHoles) ? src.availableHoles : [18],
    totalYards: src.totalYards ?? undefined,
    par: Number(src.par ?? 72),
    holeDetails: src.holeDetails ?? undefined,
    translations: src.translations ?? undefined,
    reviews: [],
  }
}

export function mapTeeTimeFromChronogolf(src: any): TeeTime {
  const booked = Number(src.bookedPlayers ?? 0)
  const max = Number(src.maxPlayers ?? 4)
  return {
    id: String(src.id ?? src.uuid ?? `${src.date}-${src.time}`),
    date: String(src.date),
    time: String(src.time),
    status: (src.status as TeeTime['status']) ?? (booked >= max ? 'booked' : 'available'),
    price: Number(src.price ?? 0),
    maxPlayers: max,
    bookedPlayers: booked,
    availableSpots: Math.max(0, max - booked),
    bookingIds: Array.isArray(src.bookingIds) ? src.bookingIds : [],
  }
}

export function mapBookingFromChronogolf(src: any): Booking {
  return {
    id: String(src.id ?? src.uuid ?? ''),
    confirmationNumber: String(src.confirmationNumber ?? ''),
    createdAt: String(src.createdAt ?? new Date().toISOString()),
    updatedAt: src.updatedAt ?? undefined,
    userId: String(src.userId ?? ''),
    userName: String(src.userName ?? ''),
    userEmail: src.userEmail ?? undefined,
    userPhone: src.userPhone ?? undefined,
    courseId: String(src.courseId ?? ''),
    courseName: String(src.courseName ?? ''),
    courseLocation: src.courseLocation ?? undefined,
    date: String(src.date),
    time: String(src.time),
    players: Number(src.players ?? 1),
    holes: Number(src.holes ?? 18),
    totalPrice: Number(src.totalPrice ?? 0),
    status: (src.status as Booking['status']) ?? 'confirmed',
    teeTimeId: String(src.teeTimeId ?? ''),
    comments: src.comments ?? undefined,
    specialRequests: src.specialRequests ?? undefined,
    couponCode: src.couponCode ?? undefined,
    version: src.version ?? undefined,
    paymentStatus: src.paymentStatus ?? undefined,
    paymentIntentId: src.paymentIntentId ?? undefined,
    refundAmount: src.refundAmount ?? undefined,
    cancellationReason: src.cancellationReason ?? undefined,
    adminNotes: src.adminNotes ?? undefined,
    formattedDate: src.formattedDate ?? undefined,
    reviewInvitationSent: src.reviewInvitationSent ?? undefined,
    reviewInvitationSentAt: src.reviewInvitationSentAt ?? undefined,
    addOns: src.addOns ?? undefined,
    customerInfo: src.customerInfo ?? undefined,
    teeDateTime: src.teeDateTime ?? undefined,
    numberOfPlayers: src.numberOfPlayers ?? undefined,
    isGuest: src.isGuest ?? undefined,
    guest: src.guest ?? undefined,
    reschedulesUsed: src.reschedulesUsed ?? undefined,
    pricing_snapshot: src.pricing_snapshot ?? undefined,
  }
}