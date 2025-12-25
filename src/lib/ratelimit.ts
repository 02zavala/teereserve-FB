const url = process.env.UPSTASH_REDIS_REST_URL || ''
const token = process.env.UPSTASH_REDIS_REST_TOKEN || ''

async function incr(key: string, ttlSec: number): Promise<number | null> {
  if (!url || !token) return null
  const r = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const count = await r.text()
  await fetch(`${url}/expire/${encodeURIComponent(key)}/${ttlSec}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseInt(count, 10)
}

export async function isRateLimitedDistributed(key: string, windowMs: number, max: number): Promise<boolean | null> {
  const ttl = Math.ceil(windowMs / 1000)
  const c = await incr(key, ttl)
  if (c === null) return null
  return c > max
}