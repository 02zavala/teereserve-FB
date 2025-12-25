import { db } from '@/lib/firebase-admin'
import type { IntegrationProvider } from '../index'
import { mapCourse, mapTeeTime } from './mapper'
import type { GolfCourse, TeeTime, Booking } from '@/types/index'

async function getCourses(): Promise<GolfCourse[]> {
  if (!db) return []
  const snap = await db.collection('courses').get()
  return snap.docs.map(d => mapCourse(d.id, d.data()))
}

async function getTeeTimes(courseId: string, date: string): Promise<TeeTime[]> {
  if (!db) return []
  const col = db.collection('courses').doc(courseId).collection('teeTimes')
  const snap = await col.where('date', '==', date).get()
  return snap.docs.map(d => mapTeeTime(d.id, d.data()))
}

async function getPrices(courseId: string, date: string): Promise<TeeTime[]> {
  return getTeeTimes(courseId, date)
}

async function createBooking(input: {
  courseId: string
  date: string
  time: string
  players: number
  guest?: { firstName: string; lastName: string; email: string; phone: string }
}, opts?: { idempotencyKey?: string }): Promise<Booking> {
  if (!db) throw new Error('Firestore not initialized')
  const ref = db.collection('bookings').doc()
  const bookingData: any = {
    courseId: input.courseId,
    date: input.date,
    teeTime: input.time,
    players: input.players,
    status: 'pending',
    isGuest: !!input.guest,
    guest: input.guest,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await ref.set(bookingData)
  const doc = await ref.get()
  return { id: doc.id, ...bookingData } as Booking
}

async function cancelBooking(bookingId: string): Promise<{ status: 'cancelled' | 'not_found'; booking?: Booking }> {
  if (!db) throw new Error('Firestore not initialized')
  const ref = db.collection('bookings').doc(bookingId)
  const doc = await ref.get()
  if (!doc.exists) return { status: 'not_found' }
  const data = doc.data() as any
  await ref.update({ status: 'canceled_customer', updatedAt: new Date().toISOString() })
  return { status: 'cancelled', booking: { id: doc.id, ...data, status: 'canceled_customer' } as Booking }
}

async function getBookingById(id: string): Promise<Booking | null> {
  if (!db) return null
  const doc = await db.collection('bookings').doc(id).get()
  if (!doc.exists) return null
  const data = doc.data() as any
  return { id: doc.id, ...data } as Booking
}

export const adapter: IntegrationProvider = {
  getCourses,
  getTeeTimes,
  getPrices,
  createBooking,
  cancelBooking,
  getBookingById,
}