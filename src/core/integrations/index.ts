import type { GolfCourse, TeeTime, Booking } from '@/types/index'

export type ProviderId = 'golfmanager' | 'chronogolf' | 'ezlinks' | 'teereserve-native'

export interface IntegrationProvider {
  getCourses(): Promise<GolfCourse[]>
  getTeeTimes(courseId: string, date: string): Promise<TeeTime[]>
  getPrices(courseId: string, date: string): Promise<TeeTime[]>
  createBooking(input: {
    courseId: string
    date: string
    time: string
    players: number
    guest?: { firstName: string; lastName: string; email: string; phone: string }
  }, opts?: { idempotencyKey?: string }): Promise<Booking>
  cancelBooking(bookingId: string): Promise<{ status: 'cancelled' | 'not_found'; booking?: Booking }>
  getBookingById(id: string): Promise<Booking | null>
}

import { adapter as nativeAdapter } from './teereserve-native/adapter'
import { adapter as golfmanagerAdapter } from './golfmanager/adapter'
import { adapter as chronogolfAdapter } from './chronogolf/adapter'
import { adapter as ezlinksAdapter } from './ezlinks/adapter'

const registry: Record<ProviderId, IntegrationProvider> = {
  'teereserve-native': nativeAdapter,
  golfmanager: golfmanagerAdapter,
  chronogolf: chronogolfAdapter,
  ezlinks: ezlinksAdapter,
}

export function getIntegrationProvider(id: ProviderId): IntegrationProvider {
  return registry[id]
}