import { getIntegrationProvider } from '../integrations'
import { resolveDataSource } from '../tenants/resolver'
import type { TeeTime } from '@/types/index'

export async function listPrices(tenantId: string, courseId: string, date: string): Promise<TeeTime[]> {
  const providerId = await resolveDataSource(tenantId)
  const provider = getIntegrationProvider(providerId)
  return provider.getPrices(courseId, date)
}