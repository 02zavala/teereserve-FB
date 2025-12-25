import { StripePaymentIntentSchema } from './schemas'
import { logFailedPaymentCentral, logSuccessfulPaymentCentral, attachPricingSnapshotToBooking } from './service'

export async function onPaymentIntentFailed(pi: any): Promise<void> {
  const parsed = StripePaymentIntentSchema.parse(pi)
  const meta = parsed.metadata || {}
  await logFailedPaymentCentral({
    paymentIntentId: parsed.id,
    amount: parsed.amount,
    amountInDollars: parsed.amount / 100,
    currency: parsed.currency,
    bookingId: meta.bookingId,
    fxRate: parseFloat((meta as any).fxRate || '1'),
    currencyAttempt: (meta as any).currencyAttempt || 'usd',
    priceUsd: parseFloat((meta as any).priceUsd || '0'),
  })
}

export async function onPaymentIntentSucceeded(pi: any): Promise<void> {
  const parsed = StripePaymentIntentSchema.parse(pi)
  const meta = parsed.metadata || {}
  await logSuccessfulPaymentCentral({
    paymentIntentId: parsed.id,
    bookingId: meta.bookingId,
    final_currency: parsed.currency.toUpperCase(),
    amount_received: parsed.amount,
    amountInDollars: parsed.amount / 100,
    fxRate: parseFloat((meta as any).fxRate || '1'),
    currencyAttempt: (meta as any).currencyAttempt || 'usd',
    priceUsd: parseFloat((meta as any).priceUsd || '0'),
  })
  await attachPricingSnapshotToBooking(parsed.id, meta.bookingId)
}