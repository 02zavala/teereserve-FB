export type Course = {
  id: string;
  name: string;
  location?: string;
  description?: string;
  basePrice?: number;
  currency?: string; // default USD
  teeTimeInterval?: number; // minutes
  operatingHours?: { openingTime: string; closingTime: string };
};

export type AvailabilitySlot = {
  date: string; // YYYY-MM-DD
  teeTime: string; // ISO
  playersMin: number;
  playersMax: number;
  publicPriceUSD: number;
  currency: string; // 'USD'
};

export type Rate = {
  id: string;
  name: string;
  description?: string;
  validFrom?: string; // ISO date
  validTo?: string; // ISO date
  publicPriceUSD: number;
  currency: string; // 'USD'
};

export type BookingInput = {
  courseId: string;
  teeTime: string; // ISO
  playerCount: number;
  pricePublicUSD: number;
  currency?: string; // 'USD'
  channel?: 'direct' | 'concierge' | 'ota';
  conciergeId?: string;
};

export type Booking = {
  id: string;
  courseId: string;
  teeTime: string; // ISO
  playerCount: number;
  pricePublicUSD: number;
  currency: string;
  status: 'confirmed' | 'cancelled' | 'pending';
  createdAt: string; // ISO
  // Optional economics snapshot for wireframe
  economics?: {
    priceNetToCourseUSD?: number;
    grossMarginUSD?: number;
    conciergeCommissionUSD?: number;
    platformCommissionUSD?: number;
  };
};

export interface TeeSheetProvider {
  getCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | null>;
  getAvailability(courseId: string, date: string): Promise<AvailabilitySlot[]>;
  getRates(courseId: string, date: string): Promise<Rate[]>;
  createBooking(input: BookingInput, idempotencyKey?: string): Promise<Booking>;
  getBookingById(id: string): Promise<Booking | null>;
  cancelBooking(id: string): Promise<{ status: 'cancelled' | 'not_found'; booking?: Booking }>;
}