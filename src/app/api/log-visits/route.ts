import { NextRequest, NextResponse } from 'next/server'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  const xClientIp = request.headers.get('x-client-ip')
  if (xClientIp) return xClientIp
  return (request as any).ip || 'unknown'
}

function getCountry(request: NextRequest): string | undefined {
  const cfCountry = request.headers.get('cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') return cfCountry
  const vercelCountry = request.headers.get('x-vercel-ip-country')
  if (vercelCountry) return vercelCountry
  const countryCode = request.headers.get('x-country-code')
  if (countryCode) return countryCode
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const country = getCountry(request)
    const ua = request.headers.get('user-agent') || ''
    const origin = request.headers.get('origin') || ''

    return NextResponse.json({ ip, country, ua, origin })
  } catch (error: any) {
    return NextResponse.json({ ip: 'unknown', country: undefined }, { status: 200 })
  }
}