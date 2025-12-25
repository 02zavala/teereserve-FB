import { getIntegrationProvider } from '../integrations'
import { resolveDataSource } from '../tenants/resolver'
import type { GolfCourse, TeeTime } from '@/types/index'

export async function listCourses(tenantId: string): Promise<GolfCourse[]> {
  const providerId = await resolveDataSource(tenantId)
  const provider = getIntegrationProvider(providerId)
  return provider.getCourses()
}

export async function listTeeTimes(tenantId: string, courseId: string, date: string): Promise<TeeTime[]> {
  const providerId = await resolveDataSource(tenantId)
  const provider = getIntegrationProvider(providerId)
  return provider.getTeeTimes(courseId, date)
}