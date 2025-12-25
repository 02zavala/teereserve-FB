import type { IntegrationProvider } from '../index'
import type { GolfCourse, TeeTime, Booking } from '@/types/index'

async function getCourses(): Promise<GolfCourse[]> { return [] }
async function getTeeTimes(courseId: string, date: string): Promise<TeeTime[]> { return [] }
async function getPrices(courseId: string, date: string): Promise<TeeTime[]> { return [] }
async function createBooking(input: { courseId: string; date: string; time: string; players: number; guest?: { firstName: string; lastName: string; email: string; phone: string } }, opts?: { idempotencyKey?: string }): Promise<Booking> { throw new Error('golfmanager adapter not implemented') }
async function cancelBooking(bookingId: string): Promise<{ status: 'cancelled' | 'not_found'; booking?: Booking }> { throw new Error('golfmanager adapter not implemented') }
async function getBookingById(id: string): Promise<Booking | null> { return null }

export const adapter: IntegrationProvider = {
  getCourses,
  getTeeTimes,
  getPrices,
  createBooking,
  cancelBooking,
  getBookingById,
}