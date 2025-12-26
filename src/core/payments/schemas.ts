import { z } from 'zod'

export const StripePaymentIntentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  metadata: z.record(z.string()).optional(),
  status: z.string(),
})

export type StripePaymentIntent = z.infer<typeof StripePaymentIntentSchema>