const url = process.env.UPSTASH_REDIS_REST_URL || ''
const token = process.env.UPSTASH_REDIS_REST_TOKEN || ''

export async function wasProcessed(key: string): Promise<boolean> {
  if (!url || !token) return false
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return false
  const v = await r.text()
  return v !== '' && v !== 'null'
}

export async function markProcessed(key: string, ttlSec: number): Promise<void> {
  if (!url || !token) return
  await fetch(`${url}/set/${encodeURIComponent(key)}/1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  await fetch(`${url}/expire/${encodeURIComponent(key)}/${ttlSec}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}