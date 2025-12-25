import { db } from '@/lib/firebase-admin'

export async function logFailedPaymentCentral(data: any): Promise<void> {
  if (!db) return
  await db.collection('failed_payments').add({
    ...data,
    createdAt: new Date(),
  })
}

export async function logSuccessfulPaymentCentral(data: any): Promise<void> {
  if (!db) return
  await db.collection('successful_payments').add({
    ...data,
    createdAt: new Date(),
  })
}

export async function attachPricingSnapshotToBooking(paymentIntentId: string, bookingId: string | undefined): Promise<void> {
  if (!db) return
  const temp = await db.collection('temp_bookings').doc(paymentIntentId).get()
  if (!temp.exists) return
  const snap = (temp.data() as any)?.pricing_snapshot
  if (!snap) return
  if (bookingId) {
    await db.collection('bookings').doc(bookingId).update({ pricing_snapshot: snap })
    await temp.ref.delete()
  }
}