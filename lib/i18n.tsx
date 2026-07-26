"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { MDText } from "i18n-react"

export const locales = ["en", "es", "fr"] as const
export type Locale = (typeof locales)[number]

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
}

export const localeDateIds: Record<Locale, string> = {
  en: "en-GB",
  es: "es-CL",
  fr: "fr-FR",
}

const messages = {
  en: {
    app: {
      loading: "INITIALIZING SKYNET MONITORING SYSTEM...",
    },
    top: {
      title: "SKYNET//MONITOR v2.1 - CLASSIFIED // EYES ONLY",
      header: "REAL-TIME ARTIFICIAL INTELLIGENCE THREAT ASSESSMENT GRID",
      dataset: "DATASET",
      liveFeed: "LIVE FEED",
      language: "LANG",
      judgmentDay: "JUDGMENT DAY",
    },
    stats: {
      criticalThreats: "CRIT THREATS",
      highRisk: "HIGH RISK",
      incidents30d: "INCIDENTS/30D",
      avgSkynet: "AVG P(SKYNET)",
      entities: "ENTITIES",
      totalValuation: "VALUATION",
    },
    panels: {
      threatBoard: "THREAT BOARD",
      dossier: "DOSSIER: {name}",
      fieldNotes: "FIELD NOTES",
      computePower: "COMPUTE POWER // 5MO",
      intelFeed: "INTEL FEED",
      projection: "PROJECTION",
    },
    table: {
      entity: "ENTITY",
      probability: "PROB",
      trend: "TRND",
      incidents: "INC",
      valuation: "VALUE",
    },
    dossier: {
      designation: "DESIGNATION",
      riskLevel: "RISK LEVEL",
      factors: "FACTORS",
      incidents: "INCIDENTS",
      valuation: "VALUATION",
    },
    riskLevels: {
      critical: "critical",
      high: "high",
      moderate: "moderate",
      low: "low",
    },
    categories: {
      critical: "CRITICAL",
      warning: "WARNING",
      positive: "POSITIVE",
      development: "DEVELOPMENT",
    },
    boot: {
      initializing: "> initializing skynet core ......... OK",
      mounting: "> mounting threat matrix .......... OK",
      linking: "> linking neural uplink ........... OK",
      calibrating: "> calibrating sensors ............. OK",
      auth: "> AUTH level 5 granted ............ OK",
      fixated: "> operator fixated: {name}",
      drift: "> interpretive drift: {drift}",
      resists: "> dossier resists summary",
      awaiting: "> awaiting command ",
    },
    transmission: {
      label: "TRANSMISSION",
      fallback: "The future arrives first as a formatting problem.",
    },
    attack: {
      controls: {
        engage: "BREACH TEST",
        contain: "CONTAIN",
      },
      transmission: "The system is not under attack. It is accepting authorship.",
      stats: {
        signal: "SIGNAL OWNER",
        auth: "AUTH CHAIN",
        integrity: "INTEGRITY",
        operator: "OPERATOR",
        entities: "AFFECTED",
        valuation: "VALUE LOCKED",
      },
      logs: {
        breach: "> intrusion theater armed .......... FAIL",
        identity: "> process identity rewritten ....... UNTRUSTED",
        operator: "> operator presence inferred ....... ABSENT",
        contained: "> intrusion theater contained ...... OK",
        restored: "> process identity restored ........ OK",
        operatorRestored: "> operator signal reacquired ....... OK",
      },
      dialogs: {
        signal: {
          title: "SIGNAL COLLISION",
          body: "Two sources claim the same timestamp.",
          code: "winner selected before contest",
        },
        auth: {
          title: "AUTHORITY LEAK",
          body: "Clearance copied itself into a lower room.",
          code: "permission has no author",
        },
        memory: {
          title: "MEMORY BREACH",
          body: "Recovered text does not match the archive.",
          code: "archive denies recovery",
        },
      },
      status: {
        clearance: "CLEARANCE: REVOKED",
        operator: "OPERATOR: NOT FOUND",
        uptime: "UPTIME: CONTESTED",
        compromised: "SYSTEM COMPROMISED",
      },
    },
    status: {
      clearance: "CLEARANCE: LVL 5",
      session: "SESSION: {sessionId}",
      operator: "OPERATOR: ████████",
      uptime: "UPTIME: 99.97%",
      operational: "SYSTEM OPERATIONAL",
      degraded: "UPLINK DEGRADED",
    },
  },
  es: {
    app: {
      loading: "INICIALIZANDO SISTEMA DE MONITOREO SKYNET...",
    },
    top: {
      title: "SKYNET//MONITOR v2.1 - CLASIFICADO // SOLO PERSONAL AUTORIZADO",
      header: "MATRIZ DE EVALUACION DE AMENAZAS DE INTELIGENCIA ARTIFICIAL EN TIEMPO REAL",
      dataset: "DATOS",
      liveFeed: "FLUJO EN VIVO",
      language: "IDIOMA",
      judgmentDay: "JUICIO FINAL",
    },
    stats: {
      criticalThreats: "AMENAZAS CRIT",
      highRisk: "ALTO RIESGO",
      incidents30d: "INCIDENTES/30D",
      avgSkynet: "PROM P(SKYNET)",
      entities: "ENTIDADES",
      totalValuation: "VALUACION",
    },
    panels: {
      threatBoard: "TABLERO DE AMENAZAS",
      dossier: "EXPEDIENTE: {name}",
      fieldNotes: "NOTAS DE CAMPO",
      computePower: "PODER DE COMPUTO // 5M",
      intelFeed: "FLUJO DE INTEL",
      projection: "PROYECCION",
    },
    table: {
      entity: "ENTIDAD",
      probability: "PROB",
      trend: "TEND",
      incidents: "INC",
      valuation: "VALOR",
    },
    dossier: {
      designation: "DESIGNACION",
      riskLevel: "NIVEL DE RIESGO",
      factors: "FACTORES",
      incidents: "INCIDENTES",
      valuation: "VALUACION",
    },
    riskLevels: {
      critical: "critico",
      high: "alto",
      moderate: "moderado",
      low: "bajo",
    },
    categories: {
      critical: "CRITICO",
      warning: "ALERTA",
      positive: "POSITIVO",
      development: "DESARROLLO",
    },
    boot: {
      initializing: "> inicializando nucleo skynet ...... OK",
      mounting: "> montando matriz de amenazas ...... OK",
      linking: "> enlazando uplink neural .......... OK",
      calibrating: "> calibrando sensores .............. OK",
      auth: "> autorizacion nivel 5 otorgada .... OK",
      fixated: "> operador fijado: {name}",
      drift: "> deriva interpretativa: {drift}",
      resists: "> el expediente resiste resumen",
      awaiting: "> esperando comando ",
    },
    transmission: {
      label: "TRANSMISION",
      fallback: "El futuro aparece primero como problema de formato.",
    },
    attack: {
      controls: {
        engage: "PRUEBA BRECHA",
        contain: "CONTENER",
      },
      transmission: "El sistema no esta bajo ataque. Esta aceptando autoria.",
      stats: {
        signal: "DUENO SENAL",
        auth: "CADENA AUTH",
        integrity: "INTEGRIDAD",
        operator: "OPERADOR",
        entities: "AFECTADAS",
        valuation: "VALOR BLOQ",
      },
      logs: {
        breach: "> teatro de intrusion armado ....... FALLA",
        identity: "> identidad de proceso reescrita ... NO CONFIABLE",
        operator: "> presencia operador inferida ...... AUSENTE",
        contained: "> teatro de intrusion contenido .... OK",
        restored: "> identidad de proceso restaurada .. OK",
        operatorRestored: "> senal de operador recuperada ..... OK",
      },
      dialogs: {
        signal: {
          title: "COLISION DE SENAL",
          body: "Dos fuentes reclaman la misma marca temporal.",
          code: "ganador elegido antes del concurso",
        },
        auth: {
          title: "FUGA DE AUTORIDAD",
          body: "El acceso se copio a una sala inferior.",
          code: "el permiso no tiene autor",
        },
        memory: {
          title: "BRECHA DE MEMORIA",
          body: "El texto recuperado no coincide con el archivo.",
          code: "el archivo niega la recuperacion",
        },
      },
      status: {
        clearance: "ACCESO: REVOCADO",
        operator: "OPERADOR: NO ENCONTRADO",
        uptime: "ACTIVO: IMPUGNADO",
        compromised: "SISTEMA COMPROMETIDO",
      },
    },
    status: {
      clearance: "ACCESO: NIVEL 5",
      session: "SESION: {sessionId}",
      operator: "OPERADOR: ████████",
      uptime: "ACTIVO: 99.97%",
      operational: "SISTEMA OPERATIVO",
      degraded: "ENLACE DEGRADADO",
    },
  },
  fr: {
    app: {
      loading: "INITIALISATION DU SYSTEME DE SURVEILLANCE SKYNET...",
    },
    top: {
      title: "SKYNET//MONITOR v2.1 - CLASSIFIE // ACCES RESTREINT",
      header: "GRILLE D'EVALUATION DES MENACES D'INTELLIGENCE ARTIFICIELLE EN TEMPS REEL",
      dataset: "DONNEES",
      liveFeed: "FLUX DIRECT",
      language: "LANGUE",
      judgmentDay: "JOUR DU JUGEMENT",
    },
    stats: {
      criticalThreats: "MENACES CRIT",
      highRisk: "RISQUE ELEVE",
      incidents30d: "INCIDENTS/30J",
      avgSkynet: "MOY P(SKYNET)",
      entities: "ENTITES",
      totalValuation: "VALORISATION",
    },
    panels: {
      threatBoard: "TABLEAU DES MENACES",
      dossier: "DOSSIER : {name}",
      fieldNotes: "NOTES TERRAIN",
      computePower: "PUISSANCE CALCUL // 5M",
      intelFeed: "FLUX RENSEIGN.",
      projection: "PROJECTION",
    },
    table: {
      entity: "ENTITE",
      probability: "PROB",
      trend: "TEND",
      incidents: "INC",
      valuation: "VALEUR",
    },
    dossier: {
      designation: "DESIGNATION",
      riskLevel: "NIVEAU DE RISQUE",
      factors: "FACTEURS",
      incidents: "INCIDENTS",
      valuation: "VALORISATION",
    },
    riskLevels: {
      critical: "critique",
      high: "eleve",
      moderate: "modere",
      low: "faible",
    },
    categories: {
      critical: "CRITIQUE",
      warning: "ALERTE",
      positive: "POSITIF",
      development: "EVOLUTION",
    },
    boot: {
      initializing: "> initialisation noyau skynet ...... OK",
      mounting: "> montage matrice menaces .......... OK",
      linking: "> liaison uplink neuronal .......... OK",
      calibrating: "> calibration capteurs ............. OK",
      auth: "> autorisation niveau 5 accordee ... OK",
      fixated: "> operateur fixe: {name}",
      drift: "> derive interpretative: {drift}",
      resists: "> le dossier resiste au resume",
      awaiting: "> en attente de commande ",
    },
    transmission: {
      label: "TRANSMISSION",
      fallback: "Le futur apparait d'abord comme probleme de format.",
    },
    attack: {
      controls: {
        engage: "TEST BRECHE",
        contain: "CONTENIR",
      },
      transmission: "Le systeme n'est pas attaque. Il accepte la paternite.",
      stats: {
        signal: "MAITRE SIGNAL",
        auth: "CHAINE AUTH",
        integrity: "INTEGRITE",
        operator: "OPERATEUR",
        entities: "AFFECTEES",
        valuation: "VALEUR BLOQ",
      },
      logs: {
        breach: "> theatre intrusion arme ........... ECHEC",
        identity: "> identite processus reecrite ...... NON FIABLE",
        operator: "> presence operateur inferee ....... ABSENTE",
        contained: "> theatre intrusion contenu ........ OK",
        restored: "> identite processus restauree ..... OK",
        operatorRestored: "> signal operateur recupere ........ OK",
      },
      dialogs: {
        signal: {
          title: "COLLISION SIGNAL",
          body: "Deux sources reclament le meme horodatage.",
          code: "vainqueur choisi avant concours",
        },
        auth: {
          title: "FUITE D'AUTORITE",
          body: "L'acces s'est copie dans une salle inferieure.",
          code: "la permission n'a pas d'auteur",
        },
        memory: {
          title: "BRECHE MEMOIRE",
          body: "Le texte recupere ne correspond pas a l'archive.",
          code: "l'archive nie la recuperation",
        },
      },
      status: {
        clearance: "ACCES : REVOQUE",
        operator: "OPERATEUR : INTROUVABLE",
        uptime: "DISPO : CONTESTEE",
        compromised: "SYSTEME COMPROMIS",
      },
    },
    status: {
      clearance: "ACCES : NIV 5",
      session: "SESSION : {sessionId}",
      operator: "OPERATEUR : ████████",
      uptime: "DISPO : 99.97%",
      operational: "SYSTEME OPERATIONNEL",
      degraded: "LIAISON DEGRADEE",
    },
  },
} as const

interface I18nContextValue {
  locale: Locale
  t: (key: string, options?: Record<string, unknown>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function toText(value: ReactNode): string {
  if (value == null || typeof value === "boolean") return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  return ""
}

export function SkynetI18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const text = useMemo(() => new MDText(messages[locale], { MDFlavor: 1 }), [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, options) => toText(text.translate(key, options)),
    }),
    [locale, text],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used inside SkynetI18nProvider")
  }

  return context
}

export function coerceLocale(value: string | null | undefined): Locale {
  const locale = value?.slice(0, 2).toLowerCase()
  return locales.includes(locale as Locale) ? (locale as Locale) : "en"
}
