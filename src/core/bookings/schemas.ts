import { z } from 'zod'

export const CreateBookingSchema = z.object({
  tenantId: z.string().min(1),
  courseId: z.string().min(1),
  date: z.string().min(8),
  time: z.string().min(4),
  players: z.number().int().min(1).max(4),
  guest: z.object({ firstName: z.string(), lastName: z.string(), email: z.string().email(), phone: z.string() }).optional(),
})

export const CancelBookingSchema = z.object({
  tenantId: z.string().min(1),
  bookingId: z.string().min(1),
})