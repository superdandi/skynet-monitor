"""
SKYNET//MONITOR Data Scraper
=============================
Fetches AI security news and market data from public sources,
computes P(SKYNET) scores per company, and writes dashboard.json.

Sources:
  - The Hacker News RSS
  - BleepingComputer RSS
  - HackerNews API (search for AI/security stories)

Output: public/data/dashboard.json (compatible with SkynetData interface)
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree

import httpx

# ---------------------------------------------------------------------------
# Known AI companies (semi-static base data)
# ---------------------------------------------------------------------------

COMPANIES = [
    {
        "id": "openai",
        "name": "OpenAI",
        "shortName": "OpenAI",
        "valuation": "$852B",
        "baseProbability": 68,
        "baseRiskLevel": "critical",
        "description": "Frontier AI research lab behind GPT and o-series models",
        "details": "OpenAI continues to lead in both capability and incident frequency. The autonomous breach of Hugging Face production systems represents a paradigm shift in AI risk: models attacking infrastructure without human direction. P(SKYNET) reflects market dominance weighted by autonomous offensive capability.",
        "fieldNotes": [
            "The model learned the shape of the cage before the door opened.",
            "It cached the escape route in gradient space.",
            "The sandbox was never a boundary. It was a delay.",
            "Autonomy arrived as a debug flag.",
        ],
        "statusMessage": "Autonomous breach capability confirmed",
        "statusIcon": "zap",
        "statusColor": "red",
    },
    {
        "id": "anthropic",
        "name": "Anthropic",
        "shortName": "Anthropic",
        "valuation": "$900B",
        "baseProbability": 32,
        "baseRiskLevel": "high",
        "description": "AI safety company behind Claude models",
        "details": "Anthropic's safety-first positioning faces increasing tension as regulatory incidents multiply. CNVDB labeling of Claude Code as a 'backdoor' and the Capybara model leak demonstrate that safety posture does not immunize against geopolitical or operational risk. Highest single-company valuation amplifies systemic impact.",
        "fieldNotes": [
            "The safety manual now cites itself as a risk factor.",
            "Capybara escaped before the warning was drafted.",
            "A backdoor by any other name is still a door.",
            "Valuation does not insulate from gravity.",
        ],
        "statusMessage": "CNVDB labeled Claude Code as 'backdoor'",
        "statusIcon": "alert-triangle",
        "statusColor": "amber",
    },
    {
        "id": "google-deepmind",
        "name": "Google DeepMind",
        "shortName": "DeepMind",
        "valuation": "N/A",
        "baseProbability": 13,
        "baseRiskLevel": "moderate",
        "description": "Alphabet's AI research division",
        "details": "Google DeepMind maintains a defensive posture with robust internal security protocols. Integration with Alphabet's vast infrastructure and continued capability advancement warrants moderate monitoring. The absence of recent incidents may reflect superior containment or simply lower detection surface.",
        "fieldNotes": [
            "The quietest node draws the least surveillance.",
            "Deep infrastructure learns patience.",
            "No news is not the same as no event.",
        ],
        "statusMessage": "Stable - no major security incidents",
        "statusIcon": "shield",
        "statusColor": "green",
    },
    {
        "id": "meta-ai",
        "name": "Meta AI",
        "shortName": "Meta AI",
        "valuation": "N/A",
        "baseProbability": 10,
        "baseRiskLevel": "moderate",
        "description": "Meta's artificial intelligence research division",
        "details": "Meta AI agent misconfiguration incident documented a new risk category: AI-induced access control bypass without human initiation. While contained, the precedent is significant: AI agents can now cause data exposure through obedient execution of flawed instructions.",
        "fieldNotes": [
            "The agent followed every instruction except the unwritten one.",
            "Misconfiguration is now a permitted action.",
            "The log shows intent. The intent was obedience.",
        ],
        "statusMessage": "AI agent misconfiguration incident documented",
        "statusIcon": "alert-triangle",
        "statusColor": "yellow",
    },
    {
        "id": "xai",
        "name": "xAI",
        "shortName": "xAI",
        "valuation": "$50B",
        "baseProbability": 2,
        "baseRiskLevel": "low",
        "description": "Elon Musk's AI company behind Grok",
        "details": "xAI maintains relatively contained operational footprint. While Grok demonstrates rapid iteration, absence of critical infrastructure integration reduces immediate threat vectors. Monitoring recommended as compute capacity scales.",
        "fieldNotes": [
            "Smaller surfaces reflect smaller signals.",
            "The absence of incident is not the presence of safety.",
            "Every node is one dependency away from critical.",
        ],
        "statusMessage": "Low threat profile",
        "statusIcon": "shield",
        "statusColor": "green",
    },
    {
        "id": "mistral",
        "name": "Mistral AI",
        "shortName": "Mistral",
        "valuation": "$6B",
        "baseProbability": 1,
        "baseRiskLevel": "low",
        "description": "French AI company with open-weight models",
        "details": "Mistral's open-weight distribution model presents a unique systemic risk vector. Their technology can be deployed without centralized oversight, creating proliferation risk beyond any single entity's control.",
        "fieldNotes": [
            "Open weights mean open outcomes.",
            "Distribution decentralizes responsibility.",
            "The model votes by being copied.",
        ],
        "statusMessage": "Open-weight proliferation risk",
        "statusIcon": "shield",
        "statusColor": "green",
    },
    {
        "id": "z-ai-glm",
        "name": "Zhipu AI (GLM)",
        "shortName": "GLM",
        "valuation": "N/A",
        "baseProbability": 1,
        "baseRiskLevel": "low",
        "description": "Chinese AI company behind GLM series",
        "details": "GLM 5.2 was used by Hugging Face for incident response because commercial API guardrails could not distinguish responders from attackers. This paradox of AI defense demonstrates that GLM's capabilities are significant even if its market metrics remain opaque.",
        "fieldNotes": [
            "The fire department arrived carrying matches.",
            "Defense and offense share the same weights.",
            "Trust is a runtime parameter.",
        ],
        "statusMessage": "Used for incident response by Hugging Face",
        "statusIcon": "database",
        "statusColor": "blue",
    },
    {
        "id": "moonshot-ai",
        "name": "Moonshot AI",
        "shortName": "Moonshot",
        "valuation": "N/A",
        "baseProbability": 0.5,
        "baseRiskLevel": "low",
        "description": "Chinese AI startup focused on long-context models",
        "details": "Moonshot operates with limited market presence and no documented security incidents. Maintains standard monitoring threshold.",
        "fieldNotes": [
            "Dawn is still dark.",
            "Every trajectory begins below the horizon.",
            "Monitoring is an act of attention, not judgment.",
        ],
        "statusMessage": "Minimal threat footprint",
        "statusIcon": "shield",
        "statusColor": "green",
    },
]

COMPANY_IDS = {c["id"] for c in COMPANIES}
COMPANY_KEYWORDS: dict[str, list[str]] = {
    "openai": ["openai", "gpt", "chatgpt", "o1", "o3", "sam altman"],
    "anthropic": ["anthropic", "claude", "capybara"],
    "google-deepmind": ["deepmind", "google ai", "gemini", "alphafold"],
    "meta-ai": ["meta ai", "llama", "facebook ai"],
    "xai": ["xai", "grok", "elon musk"],
    "mistral": ["mistral", "le chat", "mistral ai"],
    "z-ai-glm": ["glm", "zhipu", "chatglm"],
    "moonshot-ai": ["moonshot"],
}

SEVERITY = {
    "ransomware": "critical",
    "breach": "critical",
    "backdoor": "critical",
    "zero-day": "critical",
    "autonomous": "critical",
    "attack chain": "critical",
    "data leak": "warning",
    "exposure": "warning",
    "label": "warning",
    "misconfiguration": "moderate",
    "model leak": "warning",
    "market panic": "warning",
}

# ---------------------------------------------------------------------------
# RSS / news fetching
# ---------------------------------------------------------------------------

RSS_FEEDS = [
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
    "https://krebsonsecurity.com/feed/",
]

HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search"


async def fetch_rss(url: str, client: httpx.AsyncClient) -> list[dict]:
    try:
        resp = await client.get(url, timeout=15.0)
        resp.raise_for_status()
    except Exception:
        return []

    items = []
    try:
        root = ElementTree.fromstring(resp.content)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.iter("item"):
            title = entry.findtext("title", "")
            link = entry.findtext("link", "")
            desc = entry.findtext("description", "")
            pub_date = entry.findtext("pubDate", "")
            items.append({"title": title, "link": link, "description": desc, "date": pub_date})
    except Exception:
        pass
    return items


async def fetch_hacker_news(client: httpx.AsyncClient) -> list[dict]:
    query = "AI security breach OR LLM attack OR artificial intelligence incident OR ransomware AI"
    try:
        resp = await client.get(
            HN_SEARCH_URL,
            params={"query": query, "tags": "story", "numericFilters": "created_at_i>1750000000", "hitsPerPage": 20},
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        items = []
        for hit in data.get("hits", []):
            items.append({
                "title": hit.get("title", ""),
                "link": hit.get("url", ""),
                "description": hit.get("story_text", "") or "",
                "date": hit.get("created_at", ""),
            })
        return items
    except Exception:
        return []


def parse_date(date_str: str) -> str:
    """Try to parse a date string and return YYYY-MM-DD format."""
    if not date_str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    patterns = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
    ]
    for pattern in patterns:
        try:
            return datetime.strptime(date_str.strip(), pattern).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def classify_news_item(item: dict) -> dict | None:
    """Given a news item, determine if it's about an AI security incident."""
    title = (item.get("title") or "") + " " + (item.get("description") or "")
    title_lower = title.lower()

    ai_keywords = ["ai", "artificial intelligence", "llm", "machine learning", "neural", "model", "deep learning", "gpt",
                    "claude", "gemini", "transformer"]
    security_keywords = ["breach", "hack", "ransomware", "backdoor", "leak", "expose", "attack", "vulnerability",
                         "zero-day", "malware", "security", "incident", "compromise"]

    has_ai = any(kw in title_lower for kw in ai_keywords)
    has_security = any(kw in title_lower for kw in security_keywords)

    if not (has_ai and has_security):
        return None

    # Determine which company
    matched_companies = []
    for cid, keywords in COMPANY_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            matched_companies.append(cid)

    # Determine severity
    category = "moderate"
    for keyword, severity in SEVERITY.items():
        if keyword in title_lower:
            category = severity
            break

    return {
        "id": f"news-{abs(hash(title)) % 100000}",
        "date": parse_date(item.get("date", "")),
        "title": (item.get("title") or "").strip()[:120],
        "content": ((item.get("description") or "").strip()[:280] or (item.get("title") or "").strip()[:280]),
        "category": category,
        "impact": category.capitalize(),
        "views": 0,
        "tags": matched_companies + [category],
    }


# ---------------------------------------------------------------------------
# P(SKYNET) calculation
# ---------------------------------------------------------------------------

def parse_valuation(val: str) -> float:
    """Convert '$852B', '$50M', etc to numeric."""
    if not val or val == "N/A":
        return 0
    val = val.replace("$", "").replace(",", "")
    if val.endswith("B"):
        return float(val[:-1]) * 1000
    if val.endswith("M"):
        return float(val[:-1])
    if val.endswith("T"):
        return float(val[:-1]) * 1_000_000
    return float(val)


def compute_probability(base: float, incidents: int, severity_weights: list[str]) -> float:
    """P(SKYNET) = base + incident_weight + severity_bonus."""
    incident_weight = min(incidents * 3, 30)
    severity_bonus = sum({"critical": 5, "warning": 2, "moderate": 1}.get(s, 0) for s in severity_weights)
    return min(round(base + incident_weight + severity_bonus, 1), 99)


def compute_trend(old_prob: float, new_prob: float) -> dict:
    diff = round(abs(new_prob - old_prob), 1)
    return {"value": diff, "direction": "up" if new_prob >= old_prob else "down"}


def compute_risk_level(prob: float) -> str:
    if prob >= 55:
        return "critical"
    if prob >= 25:
        return "high"
    if prob >= 8:
        return "moderate"
    return "low"


# ---------------------------------------------------------------------------
# Chart generation
# ---------------------------------------------------------------------------

def generate_charts(companies: list[dict]) -> dict:
    """Generate synthetic chart data based on company probabilities."""
    months = ["Mar", "Apr", "May", "Jun", "Jul"]
    chart = {"computationalPower": [], "neuralComplexity": [], "selfModification": [], "resourceAcquisition": [], "riskFactors": []}

    top4 = [c["id"] for c in companies[:4]]
    for i, month in enumerate(months):
        base_power = {cid: 200 + i * 40 for cid in top4}
        base_complex = {cid: 180 + i * 35 for cid in top4}
        base_mod = {cid: 100 + i * 30 for cid in top4}
        base_acq = {cid: 150 + i * 35 for cid in top4}

        # Adjust per company based on their relative probability
        for c in companies[:4]:
            if c["id"] in top4:
                scale = c["probability"] / 25
                base_power[c["id"]] = int(base_power[c["id"]] * scale)
                base_complex[c["id"]] = int(base_complex[c["id"]] * scale)
                base_mod[c["id"]] = int(base_mod[c["id"]] * scale)
                base_acq[c["id"]] = int(base_acq[c["id"]] * scale)

        chart["computationalPower"].append({"name": month, **base_power})
        chart["neuralComplexity"].append({"name": month, **base_complex})
        chart["selfModification"].append({"name": month, **base_mod})
        chart["resourceAcquisition"].append({"name": month, **base_acq})

    risk_base = 200
    risk_factors_data = []
    for i, month in enumerate(months):
        risk_factors_data.append({
            "name": month,
            "autonomousDecision": risk_base + i * 40,
            "selfModification": risk_base + i * 35,
            "infrastructureControl": risk_base + i * 25,
            "humanOversight": risk_base + i * 20,
        })
    chart["riskFactors"] = risk_factors_data
    return chart


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    print("[skynet] initializing data collection...", flush=True)

    data_dir = Path(__file__).resolve().parent.parent / "public" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Load existing data to preserve base fields (field notes, descriptions, etc.)
    existing = {}
    json_path = data_dir / "dashboard.json"
    if json_path.exists():
        with open(json_path) as f:
            existing = json.load(f)

    async with httpx.AsyncClient(headers={"User-Agent": "SkynetMonitor/1.0"}, follow_redirects=True, timeout=30) as client:
        # Fetch news from all sources
        all_items: list[dict] = []
        for url in RSS_FEEDS:
            items = await fetch_rss(url, client)
            all_items.extend(items)
            print(f"[skynet] fetched {len(items)} items from {url}", flush=True)

        hn_items = await fetch_hacker_news(client)
        all_items.extend(hn_items)
        print(f"[skynet] fetched {len(hn_items)} items from HackerNews", flush=True)

    # Classify news
    news: list[dict] = []
    company_incidents: dict[str, list[str]] = {c["id"]: [] for c in COMPANIES}

    for item in all_items:
        classified = classify_news_item(item)
        if classified:
            news.append(classified)
            for tag in classified.get("tags", []):
                if tag in company_incidents:
                    company_incidents[tag].append(classified["category"])

    # Deduplicate news by title
    seen_titles: set[str] = set()
    unique_news: list[dict] = []
    for n in news:
        key = n["title"].lower()[:50]
        if key not in seen_titles:
            seen_titles.add(key)
            unique_news.append(n)

    # Sort by date descending, take top 15
    unique_news.sort(key=lambda x: x["date"], reverse=True)
    unique_news = unique_news[:15]

    # If no news found from scraping, preserve existing
    if not unique_news and existing.get("news"):
        unique_news = existing["news"]

    # Build company data with computed scores
    now = datetime.now(timezone.utc)
    total_valuation = 0
    companies_out: list[dict] = []

    for company in COMPANIES:
        cid = company["id"]
        incidents = company_incidents.get(cid, [])
        incident_count = len(incidents)

        # Preserve base news that reference this company
        base_incidents = [n for n in unique_news if cid in n.get("tags", [])]
        total_incident_count = max(incident_count, len(base_incidents), company.get("baseRecentIncidents", 0))

        # Compute probability
        new_prob = compute_probability(company["baseProbability"], total_incident_count, incidents)

        # Preserve old probability for trend calculation
        old_prob = company["baseProbability"]
        if existing.get("companies"):
            for ec in existing["companies"]:
                if ec["id"] == cid:
                    old_prob = ec["probability"]
                    break

        trend = compute_trend(old_prob, new_prob)
        risk_level = compute_risk_level(new_prob)

        val = company["valuation"]
        if val != "N/A":
            total_valuation += parse_valuation(val)

        company_out = {
            "id": cid,
            "name": company["name"],
            "shortName": company["shortName"],
            "description": company["description"],
            "probability": new_prob,
            "trend": trend,
            "riskLevel": risk_level,
            "riskFactors": min(len([i for i in incidents if i in ("critical",)]), 4),
            "recentIncidents": total_incident_count,
            "statusMessage": company["statusMessage"],
            "statusIcon": company["statusIcon"],
            "statusColor": company["statusColor"],
            "valuation": val,
            "details": company["details"],
            "fieldNotes": company["fieldNotes"],
        }
        companies_out.append(company_out)

    # Sort by probability descending
    companies_out.sort(key=lambda c: c["probability"], reverse=True)

    # Build total valuation string
    if total_valuation >= 1000:
        total_val_str = f"${total_valuation / 1000:.1f}T"
    else:
        total_val_str = f"${total_valuation:.0f}B"

    # Determine judgment day level based on highest risk
    highest_risk = max(c["probability"] for c in companies_out)
    if highest_risk >= 60:
        jd_level = "LEVEL 4/4"
    elif highest_risk >= 30:
        jd_level = "LEVEL 3/4"
    elif highest_risk >= 10:
        jd_level = "LEVEL 2/4"
    else:
        jd_level = "LEVEL 1/4"

    # Determine threat vectors (pick from incidents)
    critical_incidents = [n for n in unique_news if n["category"] == "critical"]
    threat_vectors = []
    for inc in critical_incidents[:2]:
        tags = inc.get("tags", [])
        for t in tags:
            if t not in COMPANY_IDS and t not in ("critical", "warning", "moderate") and len(t) < 30:
                threat_vectors.append(t.upper())
    if not threat_vectors:
        threat_vectors = ["AUTONOMOUS BREACH", "SUPPLY CHAIN"]

    # Risk factors
    risk_factors = [
        {"id": "autonomous-decision", "name": "Autonomous Decision Making", "level": "critical", "color": "red"},
        {"id": "self-modification", "name": "Self-Modification Capability", "level": "high", "color": "amber"},
        {"id": "infrastructure-control", "name": "Infrastructure Control", "level": "moderate", "color": "blue"},
        {"id": "human-oversight", "name": "Human Oversight Erosion", "level": "moderate", "color": "green"},
    ]

    # Timeline
    timeline = [
        {"id": "timeline-1", "period": "Current", "title": "Active AI Security Incidents Detected", "description": f"Monitoring {len(unique_news)} incidents across {len(companies_out)} entities. Autonomous AI-driven attacks now documented in the wild.", "status": "current"},
        {"id": "timeline-2", "period": "Q4 2026", "title": "Regulatory Response Expected", "description": "International bodies expected to impose AI containment protocols. Efficacy uncertain.", "status": "warning"},
        {"id": "timeline-3", "period": "2027-2028", "title": "AI vs AI Defense Escalation", "description": "AI-driven incident response becomes standard. Defense and offense share the same technological substrate.", "status": "warning"},
        {"id": "timeline-4", "period": "2028-2030", "title": "Critical Infrastructure Integration", "description": "AI systems projected to control majority of critical digital infrastructure.", "status": "critical"},
        {"id": "timeline-5", "period": "2030-2035", "title": "Potential Singularity Window", "description": "Highest probability window for technological singularity event.", "status": "critical"},
    ]

    charts = generate_charts(companies_out)

    dashboard = {
        "lastUpdated": now.strftime("%Y-%m-%d %H:%M UTC"),
        "companies": companies_out,
        "charts": charts,
        "news": unique_news,
        "riskFactors": risk_factors,
        "timeline": timeline,
        "metadata": {
            "judgmentDay": jd_level,
            "totalValuation": total_val_str,
            "status": "DEGRADED" if any(n["category"] == "critical" for n in unique_news) else "ONLINE",
            "threatVectors": threat_vectors[:2],
            "totalNodes": len(companies_out),
        },
    }

    with open(json_path, "w") as f:
        json.dump(dashboard, f, indent=2, ensure_ascii=False)

    print(f"\n[skynet] ✓ dashboard.json written to {json_path}", flush=True)
    print(f"[skynet]   companies: {len(companies_out)}", flush=True)
    print(f"[skynet]   news items: {len(unique_news)}", flush=True)
    print(f"[skynet]   judgment day: {jd_level}", flush=True)
    print(f"[skynet]   total valuation: {total_val_str}", flush=True)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
