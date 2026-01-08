import { getIntegrationProvider } from '../integrations'
import { resolveDataSource } from '../tenants/resolver'
import { CreateBookingSchema, CancelBookingSchema } from './schemas'
import type { Booking } from '@/types/index'

export async function createBooking(input: unknown): Promise<Booking> {
  const parsed = CreateBookingSchema.parse(input)
  const providerId = await resolveDataSource(parsed.tenantId)
  const provider = getIntegrationProvider(providerId)
  return provider.createBooking({
    courseId: parsed.courseId,
    date: parsed.date,
    time: parsed.time,
    players: parsed.players,
    guest: parsed.guest,
  })
}

export async function cancelBooking(input: unknown): Promise<{ status: 'cancelled' | 'not_found'; booking?: Booking }> {
  const parsed = CancelBookingSchema.parse(input)
  const providerId = await resolveDataSource(parsed.tenantId)
  const provider = getIntegrationProvider(providerId)
  return provider.cancelBooking(parsed.bookingId)
}

export async function getBookingById(tenantId: string, bookingId: string): Promise<Booking | null> {
  const providerId = await resolveDataSource(tenantId)
  const provider = getIntegrationProvider(providerId)
  return provider.getBookingById(bookingId)
}