"use client"

import { useState, useEffect, useRef } from "react"
import type { SkynetData } from "@/data/skynet-data"
import { localeDateIds, localeLabels, locales, useI18n, type Locale } from "@/lib/i18n"

interface SkynetDashboardProps {
  data: SkynetData
  locale: Locale
  onLocaleChange: (locale: Locale) => void
}

/* ----------------------------- TUI primitives ----------------------------- */

const COLS = {
  critical: "text-red-400",
  high: "text-orange-400",
  moderate: "text-yellow-400",
  low: "text-green-400",
  dim: "text-green-700",
  base: "text-green-400",
} as const

function riskClass(level: string) {
  switch (level) {
    case "critical":
      return COLS.critical
    case "high":
      return COLS.high
    case "moderate":
      return COLS.moderate
    case "low":
      return COLS.low
    default:
      return COLS.base
  }
}

function Panel({
  title,
  children,
  className = "",
  accent = "text-green-400",
}: {
  title: string
  children: React.ReactNode
  className?: string
  accent?: string
}) {
  return (
    <section className={`relative flex flex-col ${className}`}>
      <div className={`flex items-center whitespace-pre leading-none ${accent} text-xs select-none`}>
        <span>┌─[ </span>
        <span className="font-bold tracking-widest">{title}</span>
        <span> ]</span>
        <span className="flex-1 overflow-hidden">
          {"─".repeat(400)}
        </span>
        <span>┐</span>
      </div>
      <div className={`flex flex-1 min-h-0 ${accent}`}>
        <span className="text-xs leading-none select-none">│</span>
        <div className="flex-1 min-w-0 px-2 py-1 text-green-400">{children}</div>
        <span className="text-xs leading-none select-none">│</span>
      </div>
      <div className={`whitespace-pre leading-none ${accent} text-xs select-none overflow-hidden`}>
        {"└" + "─".repeat(400) + "┘"}
      </div>
    </section>
  )
}

function AsciiBar({ value, max = 100, width = 20, className = "" }: { value: number; max?: number; width?: number; className?: string }) {
  const ratio = Math.max(0, Math.min(1, value / max))
  const filled = Math.round(ratio * width)
  const empty = width - filled
  return (
    <span className={`whitespace-pre ${className}`}>
      {"█".repeat(filled)}
      <span className="text-green-900">{"░".repeat(empty)}</span>
    </span>
  )
}

const BLOCKS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]

function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1)
  return (
    <span className={`whitespace-pre ${className}`}>
      {values.map((v, i) => {
        const idx = Math.round((v / max) * (BLOCKS.length - 1))
        return BLOCKS[idx]
      })}
    </span>
  )
}

/* ------------------------------- animations ------------------------------- */

function useTypewriter(text: string, speed = 24) {
  const [out, setOut] = useState("")
  useEffect(() => {
    setOut("")
    let i = 0
    const id = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

function Cursor() {
  return <span className="cursor-blink">█</span>
}

function RedactedText({ text, active }: { text: string; active: boolean }) {
  let redacted = 0

  return (
    <>
      {text.split(/(\s+)/).map((part, index) => {
        const word = part.replace(/[^A-Za-z]/g, "")
        const shouldRedact = word.length > 7 && (index + text.length) % 9 === 0 && redacted < 3

        if (!part.trim() || !shouldRedact) return part

        redacted += 1

        return (
          <span key={`${part}-${index}`} className={active ? "redacted-word is-redacted" : "redacted-word"}>
            {active ? "█".repeat(part.length) : part}
          </span>
        )
      })}
    </>
  )
}

function AttackWindows({ tick }: { tick: number }) {
  const { t } = useI18n()
  const pulse = tick % 6

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden text-[11px]">
      <div className={`attack-dialog attack-dialog-a ${pulse >= 3 ? "is-lit" : ""}`}>
        <div className="attack-dialog-title">[ {t("attack.dialogs.signal.title")} ]</div>
        <div>{t("attack.dialogs.signal.body")}</div>
        <div className="attack-dialog-code">{">>>"} {t("attack.dialogs.signal.code")}</div>
      </div>
      <div className={`attack-dialog attack-dialog-b hidden sm:block ${pulse === 1 || pulse === 4 ? "is-lit" : ""}`}>
        <div className="attack-dialog-title">[ {t("attack.dialogs.auth.title")} ]</div>
        <div>{t("attack.dialogs.auth.body")}</div>
        <div className="attack-dialog-code">{">"} {t("attack.dialogs.auth.code")}</div>
      </div>
      <div className={`attack-dialog attack-dialog-c hidden lg:block ${pulse >= 2 && pulse <= 4 ? "is-lit" : ""}`}>
        <div className="attack-dialog-title">[ {t("attack.dialogs.memory.title")} ]</div>
        <div>{t("attack.dialogs.memory.body")}</div>
        <div className="attack-dialog-code">{">"} {t("attack.dialogs.memory.code")}</div>
      </div>
    </div>
  )
}

/* -------------------------------- dashboard ------------------------------- */

export function SkynetDashboard({ data, locale, onLocaleChange }: SkynetDashboardProps) {
  const { t } = useI18n()
  const [now, setNow] = useState(new Date())
  const [selected, setSelected] = useState(data.companies[0]?.id ?? "")
  const [tick, setTick] = useState(0)
  const [bootLines, setBootLines] = useState<string[]>([])
  const [attackMode, setAttackMode] = useState(false)
  const sessionId = useRef(Math.random().toString(36).slice(2, 10).toUpperCase())
  const previousSelected = useRef(selected)
  const attackToggleSeen = useRef(false)
  const meta = data.metadata

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    const k = setInterval(() => setTick((p) => p + 1), 600)
    return () => {
      clearInterval(t)
      clearInterval(k)
    }
  }, [])

  useEffect(() => {
    const lines = [
      t("boot.initializing"),
      t("boot.mounting"),
      t("boot.linking"),
      t("boot.calibrating"),
      t("boot.auth"),
    ]
    setBootLines([])
    let i = 0
    const id = setInterval(() => {
      setBootLines((p) => [...p, lines[i]])
      i++
      if (i >= lines.length) clearInterval(id)
    }, 220)
    return () => clearInterval(id)
  }, [t])

  const header = useTypewriter(t("top.header"))

  const critical = data.companies.filter((c) => c.riskLevel === "critical")
  const high = data.companies.filter((c) => c.riskLevel === "high")
  const totalIncidents = data.companies.reduce((s, c) => s + c.recentIncidents, 0)
  const avg = Math.round(data.companies.reduce((s, c) => s + c.probability, 0) / data.companies.length)
  const sel = data.companies.find((c) => c.id === selected) ?? data.companies[0]!
  const activeNote = attackMode
    ? t("attack.transmission")
    : (sel?.fieldNotes?.[Math.floor(tick / 5) % (sel?.fieldNotes?.length ?? 1)] ?? t("transmission.fallback"))
  const redactionActive = attackMode || tick % 8 === 5 || tick % 13 === 9

  const sorted = [...data.companies].sort((a, b) => b.probability - a.probability)

  const cp = data.charts?.computationalPower ?? []
  const series: { key: string; label: string; color: string }[] = [
    { key: "openai", label: "OPEN", color: "text-red-400" },
    { key: "anthropic", label: "ANTH", color: "text-orange-400" },
    { key: "google", label: "GGL", color: "text-yellow-400" },
    { key: "meta", label: "META", color: "text-green-400" },
  ]

  useEffect(() => {
    if (previousSelected.current === selected || !sel) return

    previousSelected.current = selected
    setBootLines((lines) => [
      ...lines.slice(-8),
      t("boot.fixated", { name: sel.shortName.toUpperCase() }),
      t("boot.drift", { drift: (sel.probability / 100).toFixed(2) }),
      t("boot.resists"),
    ])
  }, [selected, sel?.probability, sel?.shortName, t])

  useEffect(() => {
    if (!attackToggleSeen.current) {
      attackToggleSeen.current = true
      return
    }

    setBootLines((lines) => [
      ...lines.slice(-8),
      attackMode ? t("attack.logs.breach") : t("attack.logs.contained"),
      attackMode ? t("attack.logs.identity") : t("attack.logs.restored"),
      attackMode ? t("attack.logs.operator") : t("attack.logs.operatorRestored"),
    ])
  }, [attackMode, t])

  return (
    <div
      className={`crt relative min-h-screen bg-black text-green-400 font-mono text-[13px] leading-tight p-3 selection:bg-green-400 selection:text-black ${
        attackMode ? "attack-mode attack-shiver" : ""
      }`}
    >
      {attackMode && <AttackWindows tick={tick} />}

      {/* ============================ TOP TITLE BAR ============================ */}
      <div className="border border-green-700 mb-2">
        <div className="flex items-stretch justify-between bg-green-400 text-black px-2 py-0.5 text-xs font-bold tracking-widest">
          <span className={`cursor-blink-invert ${attackMode ? "attack-scramble" : ""}`}>{t("top.title")}</span>
          <span>{now.toLocaleString(localeDateIds[locale], { hour12: false })}</span>
        </div>
        <div className="px-2 py-1 flex flex-wrap items-center gap-x-6 gap-y-0.5">
          <span className={`text-green-300 ${attackMode ? "attack-scramble" : ""}`}>
            {header}
            <Cursor />
          </span>
          <span className="ml-auto text-xs text-green-700">
            {t("top.dataset")}: {data.lastUpdated}
          </span>
          <span className="text-xs text-red-400 blink-slow">● {t("top.liveFeed")}</span>
          {meta?.judgmentDay && (
            <span className="text-xs text-yellow-400 font-bold">
              {t("top.judgmentDay")}: {meta.judgmentDay}
            </span>
          )}
          <button
            type="button"
            onClick={() => setAttackMode((value) => !value)}
            aria-pressed={attackMode}
            className={`border px-1 leading-tight text-xs font-bold tracking-widest ${
              attackMode
                ? "border-red-300 bg-red-500 text-black attack-panic"
                : "border-red-900 text-red-500 hover:border-red-500 hover:text-red-300"
            }`}
          >
            {attackMode ? t("attack.controls.contain") : t("attack.controls.engage")}
          </button>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-green-700">{t("top.language")}:</span>
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onLocaleChange(item)}
                className={`border px-1 leading-tight ${
                  item === locale
                    ? "border-green-300 bg-green-400 text-black"
                    : "border-green-800 text-green-600 hover:border-green-500 hover:text-green-300"
                }`}
              >
                {localeLabels[item]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============================== STAT STRIP ============================== */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2 text-xs">
        <StatCell
          label={attackMode ? t("attack.stats.signal") : t("stats.criticalThreats")}
          value={attackMode ? "OVERRIDE" : critical.length}
          color="text-red-400"
          alert
        />
        <StatCell
          label={attackMode ? t("attack.stats.auth") : t("stats.highRisk")}
          value={attackMode ? "FAILED" : high.length}
          color="text-orange-400"
          alert={attackMode}
        />
        <StatCell
          label={attackMode ? t("attack.stats.integrity") : t("stats.incidents30d")}
          value={attackMode ? "03%" : totalIncidents}
          color="text-yellow-400"
        />
        <StatCell
          label={attackMode ? t("attack.stats.operator") : t("stats.avgSkynet")}
          value={attackMode ? "ABSENT" : `${avg}%`}
          color="text-green-300"
        />
        <StatCell
          label={attackMode ? t("attack.stats.entities") : t("stats.entities")}
          value={attackMode ? "ALL" : data.companies.length}
          color="text-green-400"
        />
        <StatCell
          label={attackMode ? t("attack.stats.valuation") : t("stats.totalValuation")}
          value={attackMode ? "LOCKED" : (meta?.totalValuation ?? "N/A")}
          color="text-green-400"
        />
      </div>

      {/* ============================== MAIN GRID ============================== */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-2 ${attackMode ? "attack-grid" : ""}`}>
        {/* LEFT: threat board */}
        <Panel title={t("panels.threatBoard")} className="lg:col-span-5" accent="text-green-600">
          <div className="text-xs">
            <div className="flex text-green-700 border-b border-green-900 pb-1 mb-1 whitespace-pre">
              <span className="w-4">#</span>
              <span className="w-20">{t("table.entity")}</span>
              <span className="w-36 hidden xl:inline">P(SKYNET)</span>
              <span className="w-10 text-right">{t("table.probability")}</span>
              <span className="w-10 text-right">{t("table.trend")}</span>
              <span className="w-10 text-right">{t("table.incidents")}</span>
              <span className="w-16 text-right">{t("table.valuation")}</span>
            </div>
            <div className="max-h-[460px] overflow-y-auto pr-1 tui-scroll">
              {sorted.map((c, i) => {
                const active = c.id === selected
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`flex w-full text-left whitespace-pre items-center py-0.5 ${riskClass(
                      c.riskLevel,
                    )} ${active ? "bg-green-400 text-black" : "hover:bg-green-950"} ${
                      attackMode && (i + tick) % 4 === 0 ? "attack-row" : ""
                    }`}
                  >
                    <span className="w-4">{active ? ">" : String(i + 1).padStart(2, "0").slice(-1)}</span>
                    <span className="w-20 truncate font-bold">{c.shortName}</span>
                    <span className="w-36 hidden xl:inline">
                      <AsciiBar value={c.probability} width={22} className={active ? "text-black" : ""} />
                    </span>
                    <span className="w-10 text-right">{c.probability}%</span>
                    <span className="w-10 text-right">
                      {c.trend.direction === "up" ? "▲" : "▼"}
                      {c.trend.value}
                    </span>
                    <span className="w-10 text-right">{c.recentIncidents}</span>
                    <span className="w-16 text-right text-green-600">{c.valuation ?? "—"}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Panel>

        {/* CENTER: detail + chart */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <Panel title={t("panels.dossier", { name: sel?.shortName ?? "" })} accent="text-green-600">
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-green-700">{t("dossier.designation")}</span>
                <span className="text-green-300">{sel?.name}</span>
              </div>
              {sel?.valuation && (
                <div className="flex justify-between">
                  <span className="text-green-700">{t("dossier.valuation")}</span>
                  <span className="text-green-300">{sel.valuation}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-green-700">{t("dossier.riskLevel")}</span>
                <span className={`font-bold uppercase ${riskClass(sel?.riskLevel ?? "low")}`}>
                  {sel?.riskLevel === "critical" && <span className="blink-fast">⚠ </span>}
                  {t(`riskLevels.${sel?.riskLevel ?? "low"}`)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-700">P(SKYNET)</span>
                <AsciiBar value={sel?.probability ?? 0} width={24} className={riskClass(sel?.riskLevel ?? "low")} />
                <span className={riskClass(sel?.riskLevel ?? "low")}>{sel?.probability}%</span>
              </div>
              <div className="text-green-700 pt-1">
                {t("dossier.factors")}: {sel?.riskFactors} │ {t("dossier.incidents")}: {sel?.recentIncidents}
              </div>
              <div className="border-t border-green-900 my-1" />
              <p className="text-green-500 leading-relaxed">
                <RedactedText text={sel?.details ?? ""} active={redactionActive} />
                <Cursor />
              </p>
            </div>
          </Panel>

          <Panel title={t("panels.fieldNotes")} accent="text-green-600">
            <div className="text-xs space-y-1">
              {(sel?.fieldNotes ?? []).map((note, index) => (
                <div
                  key={note}
                  className={`literary-line flex gap-2 ${
                    note === activeNote ? "text-green-300 corrupt-line" : "text-green-700"
                  }`}
                >
                  <span className="text-green-800">{String(index + 1).padStart(2, "0")}</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t("panels.computePower")} accent="text-green-600">
            <div className="text-xs space-y-0.5">
              {series.map((s) => {
                const vals = cp.map((d: any) => d[s.key] as number)
                const last = vals[vals.length - 1]
                return (
                  <div key={s.key} className="flex items-center gap-2 whitespace-pre">
                    <span className={`w-12 ${s.color}`}>{s.label}</span>
                    <span className={`${s.color} text-base tracking-tighter`}>
                      <Sparkline values={vals} />
                    </span>
                    <span className="ml-auto text-green-700">{last ?? 0}TF</span>
                  </div>
                )
              })}
              <div className="text-green-800 whitespace-pre pt-1">
                {"   "}
                {cp.map((d: any) => (d.name as string).slice(0, 1)).join("    ")}
              </div>
            </div>
          </Panel>
        </div>

        {/* RIGHT: feeds */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <Panel title={t("panels.intelFeed")} accent="text-green-600">
            <div className="max-h-[210px] overflow-y-auto tui-scroll text-xs space-y-2 pr-1">
              {data.news.map((n) => (
                <div key={n.id} className="whitespace-normal">
                  <div className="flex justify-between text-[11px]">
                    <span
                      className={
                        n.category === "critical"
                          ? "text-red-400"
                          : n.category === "warning"
                            ? "text-orange-400"
                            : n.category === "positive"
                              ? "text-green-400"
                              : "text-yellow-400"
                      }
                    >
                      [{t(`categories.${n.category}`)}]
                    </span>
                    <span className="text-green-800">{n.date}</span>
                  </div>
                  <div className={`text-green-300 font-bold ${attackMode && n.category === "critical" ? "attack-scramble" : ""}`}>
                    {n.title}
                  </div>
                  <div className="text-green-700 line-clamp-2">{n.content}</div>
                  {n.tags && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {n.tags.map((tag) => (
                        <span key={tag} className="text-[9px] text-green-800 border border-green-900 px-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t("panels.projection")} accent="text-green-600">
            <div className="text-xs space-y-1 max-h-[210px] overflow-y-auto tui-scroll pr-1">
              {data.timeline.map((t) => {
                const c =
                  t.status === "critical"
                    ? "text-red-400"
                    : t.status === "warning"
                      ? "text-orange-400"
                      : "text-green-400"
                return (
                  <div key={t.id} className="whitespace-pre-wrap">
                    <div className={`${c} font-bold flex items-center gap-1`}>
                      {t.status === "current" ? <span className="blink-fast">▶</span> : <span>├</span>}
                      {t.period}
                    </div>
                    <div className="text-green-400 pl-2">{t.title}</div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      </div>

      {/* ============================ TRANSMISSION ============================ */}
      <div className={`mt-2 border border-green-900 px-2 py-1 text-[11px] text-green-500 ${attackMode ? "attack-transmission" : ""}`}>
        <span className="text-green-700">{t("transmission.label")}:</span>{" "}
        <span className="corrupt-line text-green-300">{activeNote}</span>
      </div>

      {/* ============================== BOOT LOG ============================== */}
      <div className="mt-2 border border-green-900 px-2 py-1 text-[11px] text-green-700">
        {bootLines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        {bootLines.length >= 5 && (
          <div className="text-green-400">
            {t("boot.awaiting")}
            <Cursor />
          </div>
        )}
      </div>

      {/* ============================ BOTTOM STATUS ============================ */}
      <div className="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-1 bg-green-400 text-black px-2 py-0.5 text-[11px] font-bold tracking-wide">
        <span>{attackMode ? t("attack.status.clearance") : t("status.clearance")}</span>
        <span>{t("status.session", { sessionId: sessionId.current })}</span>
        <span>{attackMode ? t("attack.status.operator") : t("status.operator")}</span>
        <span>{attackMode ? t("attack.status.uptime") : t("status.uptime")}</span>
        <span className={tick % 2 === 0 ? "" : "opacity-30"}>
          ● {meta?.status === "DEGRADED" && !attackMode ? t("status.degraded") : attackMode ? t("attack.status.compromised") : t("status.operational")}
        </span>
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  color,
  alert = false,
}: {
  label: string
  value: string | number
  color: string
  alert?: boolean
}) {
  return (
    <div className="border border-green-800 px-2 py-1 flex flex-col">
      <span className="text-[10px] text-green-700 tracking-widest">{label}</span>
      <span className={`text-xl font-bold ${color} ${alert ? "blink-slow" : ""}`}>{value}</span>
    </div>
  )
}
