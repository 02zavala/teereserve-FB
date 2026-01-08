import { db } from '@/lib/firebase-admin'
import type { ProviderId } from '../integrations'

export async function resolveDataSource(tenantId: string): Promise<ProviderId> {
  if (!db) return 'teereserve-native'
  const doc = await db.collection('tenants').doc(tenantId).get()
  const ds = (doc.exists ? (doc.data() as any)?.dataSource : null) as ProviderId | null
  return (ds && (['golfmanager','chronogolf','ezlinks','teereserve-native'] as ProviderId[]).includes(ds)) ? ds : 'teereserve-native'
}