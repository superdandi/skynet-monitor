"use client"

import { useState, useEffect } from "react"
import { SkynetDashboard } from "@/components/skynet-dashboard"
import { coerceLocale, SkynetI18nProvider, useI18n, type Locale } from "@/lib/i18n"
import type { SkynetData } from "@/data/skynet-data"

const DATA_URL = process.env.NEXT_PUBLIC_DATA_URL || "/data/dashboard.json"

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const [locale, setLocale] = useState<Locale>("en")
  const [data, setData] = useState<SkynetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("skynet-locale")
    setLocale(coerceLocale(savedLocale ?? window.navigator.language))
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      window.localStorage.setItem("skynet-locale", locale)
    }
  }, [locale, mounted])

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: SkynetData) => setData(json))
      .catch((err) => {
        console.error("Failed to load dashboard data:", err)
        setError(err.message)
      })
  }, [])

  return (
    <SkynetI18nProvider locale={locale}>
      {!mounted || !data ? (
        <LoadingScreen error={error} />
      ) : (
        <SkynetDashboard data={data} locale={locale} onLocaleChange={setLocale} />
      )}
    </SkynetI18nProvider>
  )
}

function LoadingScreen({ error }: { error: string | null }) {
  const { t } = useI18n()
  const [dots, setDots] = useState("")

  useEffect(() => {
    if (error) return
    const id = setInterval(() => setDots((p) => (p.length >= 5 ? "" : p + ".")), 500)
    return () => clearInterval(id)
  }, [error])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="text-green-400 font-mono text-xl animate-pulse">
        {error ? `UPLINK FAILED: ${error}` : `${t("app.loading")}${dots}`}
      </div>
      {!error && (
        <div className="text-green-800 font-mono text-xs">
          <span className="cursor-blink">█</span> awaiting signal from skynet core...
        </div>
      )}
    </div>
  )
}
