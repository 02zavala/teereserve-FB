import { format, parseISO, set, addMinutes } from 'date-fns';
import { initialCourses } from '@/lib/data';
import type { TeeSheetProvider, Course, AvailabilitySlot, Rate, BookingInput, Booking } from '../TeeSheetProvider';

// In-memory stores for the wireframe
const bookings = new Map<string, Booking>();
const idempotencyMap = new Map<string, string>(); // Idempotency-Key -> bookingId

function toCourse(c: any): Course {
  return {
    id: c.id,
    name: c.name,
    location: c.location,
    description: c.description,
    basePrice: c.basePrice,
    teeTimeInterval: c.teeTimeInterval,
    operatingHours: c.operatingHours,
    currency: 'USD',
  };
}

function generateAvailability(course: Course, date: string): AvailabilitySlot[] {
  const interval = course.teeTimeInterval || 10;
  const opening = course.operatingHours?.openingTime || '07:00';
  const closing = course.operatingHours?.closingTime || '17:00';

  const [openH, openM] = opening.split(':').map(Number);
  const [closeH, closeM] = closing.split(':').map(Number);
  const base = set(parseISO(`${date}T00:00:00.000Z`), { hours: openH, minutes: openM });
  const end = set(parseISO(`${date}T00:00:00.000Z`), { hours: closeH, minutes: closeM });

  const slots: AvailabilitySlot[] = [];
  let current = base;
  while (current <= end) {
    const iso = current.toISOString();
    const hour = current.getUTCHours();
    // Simple pricing bands: early bird -10%, midday base, twilight -15%
    const basePrice = course.basePrice || 150;
    let price = basePrice;
    if (hour < 9) price = +(basePrice * 0.9).toFixed(2);
    else if (hour >= 15) price = +(basePrice * 0.85).toFixed(2);

    slots.push({
      date,
      teeTime: iso,
      playersMin: 1,
      playersMax: 4,
      publicPriceUSD: price,
      currency: 'USD',
    });
    current = addMinutes(current, interval);
  }

  return slots.slice(0, Math.max(0, slots.length - 1)); // avoid closing time exact
}

function generateRates(course: Course, date: string): Rate[] {
  const basePrice = course.basePrice || 150;
  return [
    { id: `${course.id}-std-${date}`, name: 'Standard', publicPriceUSD: basePrice, currency: 'USD' },
    { id: `${course.id}-early-${date}`, name: 'Early Bird', publicPriceUSD: +(basePrice * 0.9).toFixed(2), currency: 'USD' },
    { id: `${course.id}-twilight-${date}`, name: 'Twilight', publicPriceUSD: +(basePrice * 0.85).toFixed(2), currency: 'USD' },
  ];
}

export const mockProvider: TeeSheetProvider = {
  async getCourses(): Promise<Course[]> {
    return initialCourses.map(toCourse);
  },

  async getCourseById(id: string): Promise<Course | null> {
    const c = initialCourses.find((x) => x.id === id);
    return c ? toCourse(c) : null;
  },

  async getAvailability(courseId: string, date: string): Promise<AvailabilitySlot[]> {
    const c = initialCourses.find((x) => x.id === courseId);
    if (!c) return [];
    return generateAvailability(toCourse(c), date);
  },

  async getRates(courseId: string, date: string): Promise<Rate[]> {
    const c = initialCourses.find((x) => x.id === courseId);
    if (!c) return [];
    return generateRates(toCourse(c), date);
  },

  async createBooking(input: BookingInput, idempotencyKey?: string): Promise<Booking> {
    if (idempotencyKey && idempotencyMap.has(idempotencyKey)) {
      const existingId = idempotencyMap.get(idempotencyKey)!;
      const existing = bookings.get(existingId);
      if (existing) return existing;
    }

    const id = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const currency = input.currency || 'USD';
    const economics = {
      priceNetToCourseUSD: +(input.pricePublicUSD * 0.85).toFixed(2),
      grossMarginUSD: +(input.pricePublicUSD * 0.15).toFixed(2),
      conciergeCommissionUSD: input.channel === 'concierge' ? +(input.pricePublicUSD * 0.05).toFixed(2) : 0,
      platformCommissionUSD:
        input.channel === 'concierge'
          ? +(input.pricePublicUSD * 0.10).toFixed(2)
          : +(input.pricePublicUSD * 0.15).toFixed(2),
    };

    const booking: Booking = {
      id,
      courseId: input.courseId,
      teeTime: input.teeTime,
      playerCount: input.playerCount,
      pricePublicUSD: input.pricePublicUSD,
      currency,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      economics,
    };
    bookings.set(id, booking);
    if (idempotencyKey) idempotencyMap.set(idempotencyKey, id);
    return booking;
  },

  async getBookingById(id: string): Promise<Booking | null> {
    return bookings.get(id) || null;
  },

  async cancelBooking(id: string): Promise<{ status: 'cancelled' | 'not_found'; booking?: Booking }> {
    const b = bookings.get(id);
    if (!b) return { status: 'not_found' };
    const cancelled: Booking = { ...b, status: 'cancelled' };
    bookings.set(id, cancelled);
    return { status: 'cancelled', booking: cancelled };
  },
};