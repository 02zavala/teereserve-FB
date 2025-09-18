
'use client'

import { useEffect, useState } from "react"
import type { getDictionary } from "@/lib/get-dictionary"

const STORAGE_KEY = "teereserve_cookie_consent_v1"

type Consent = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const defaultConsent: Consent = { necessary: true, analytics: false, marketing: false }

interface CookieConsentProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['cookieConsent'];
}

export function CookieConsent({ dictionary }: CookieConsentProps) {
  const [open, setOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [consent, setConsent] = useState<Consent>(defaultConsent)

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) {
      // Delay showing the banner slightly to avoid layout shifts on initial load
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    } else {
      try {
        setConsent(JSON.parse(raw))
      } catch {
        setOpen(true)
      }
    }
  }, [])

  const save = (c: Consent) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
    setConsent(c)
    setOpen(false)
    setConfigOpen(false)
    // Dispatch a custom event so analytics loaders can react
    window.dispatchEvent(new CustomEvent("teereserve:consent", { detail: c }))
  }

  if (!open && !configOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-x-0 bottom-0 z-50 p-4 flex justify-center"
    >
      <div className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-5">
        <div className="flex items-start gap-4 p-6">
          <div aria-hidden className="mt-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🍪</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-primary">{dictionary.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {dictionary.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => save({ necessary: true, analytics: true, marketing: true })}
              >
                {dictionary.acceptAll}
              </button>
              <button
                className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => save({ necessary: true, analytics: false, marketing: false })}
              >
                {dictionary.rejectAll}
              </button>
              <button
                className="rounded-md border border-border bg-card px-4 py-2 text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => setConfigOpen(true)}
              >
                {dictionary.configure}
              </button>
              <a href="/privacy" className="text-sm text-primary underline underline-offset-2">
                {dictionary.privacyPolicy}
              </a>
            </div>
          </div>
          <button aria-label={dictionary.close} className="ml-2 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>

        {configOpen && (
          <div className="border-t border-border p-6">
            <h3 className="mb-3 text-base font-medium text-primary">{dictionary.preferencesTitle}</h3>
            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{dictionary.necessary.title}</div>
                  <div className="text-muted-foreground">{dictionary.necessary.description}</div>
                </div>
                <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              </label>
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{dictionary.analytics.title}</div>
                  <div className="text-muted-foreground">{dictionary.analytics.description}</div>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={consent.analytics}
                  onChange={(e) => setConsent((c) => ({ ...c, analytics: e.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{dictionary.marketing.title}</div>
                  <div className="text-muted-foreground">{dictionary.marketing.description}</div>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={consent.marketing}
                  onChange={(e) => setConsent((c) => ({ ...c, marketing: e.target.checked }))}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button className="px-4 py-2 text-primary" onClick={() => setConfigOpen(false)}>
                {dictionary.cancel}
              </button>
              <button
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => save(consent)}
              >
                {dictionary.savePreferences}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
