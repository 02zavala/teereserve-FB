'use client'

import { useCallback } from 'react'
import { db } from '@/lib/firebase'
import { addDoc, collection } from 'firebase/firestore'

type Stage = 'view' | 'select' | 'checkout' | 'abandoned' | 'paid'

export function useLogger() {
  const logEvent = useCallback(async (eventName: string, data: Record<string, any>) => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    const ref = typeof document !== 'undefined' ? document.referrer || undefined : undefined
    const url = typeof window !== 'undefined' ? window.location.href : undefined
    const lang = typeof navigator !== 'undefined' ? navigator.language : undefined
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    const device = (() => {
      const u = (ua || '').toLowerCase()
      if (!u) return 'unknown'
      if (/bot|crawler|spider|crawling/i.test(u)) return 'bot'
      if (/mobile|iphone|ipod|android.*mobile|blackberry|phone/i.test(u)) return 'mobile'
      if (/ipad|tablet|android(?!.*mobile)/i.test(u)) return 'tablet'
      return 'desktop'
    })()

    const stage: Stage = (data?.stage || 'view') as Stage

    const payload = {
      event: eventName,
      courseId: data?.courseId,
      teeTime: data?.teeTime,
      stage,
      timestamp: new Date().toISOString(),
      userAgent: ua,
      device,
      referrer: ref,
      url,
      lang,
      timezone: tz,
      country: undefined as string | undefined,
      extra: data || {}
    }

    try {
      const res = await fetch('/api/log-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: payload.courseId, teeTime: payload.teeTime, stage: payload.stage, lang })
      })
      if (res.ok) {
        const enriched = await res.json()
        payload.country = enriched?.country || undefined
      }
    } catch {}

    try {
      if (!db) return;
      await addDoc(collection(db!, 'visit_logs'), payload)
    } catch {}
  }, [])

  return { logEvent }
}