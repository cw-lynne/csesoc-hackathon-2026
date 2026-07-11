"""AI features powered by Claude (Anthropic Python SDK).

Two capabilities, both grounded so the model never fabricates the numbers that
make ecocompass credible:

  * generate_narrative() — turns the deterministic swap analysis into a short,
    human-readable briefing. The engine computes every figure; Claude only
    explains what's already there.
  * extract_bom() — reads a messy bill of materials (phone photo, PDF, Excel,
    CSV) and returns structured rows, mapping each material to the library.

The API key is read from ANTHROPIC_API_KEY by the default client. If it's unset,
the SDK raises on the first request; the API layer turns that into a clean 503
so the rest of the app keeps working.
"""

import base64
import io
import json
import os
import re

import anthropic

from materials import DATA
from score import analyze_bom

# Opus 4.8 for both: strong at grounded writing and at vision/PDF extraction.
# Swap to "claude-haiku-4-5" (cheaper/faster) if you want to trade quality for cost.
MODEL = "claude-opus-4-8"

_client = None


def client():
    """Lazily construct the SDK client so the server starts without a key."""
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def ai_configured():
    """Best-effort signal for the health endpoint (an ambient CLI profile also works)."""
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


# ---------------------------------------------------------------------------
# 1) Swap narrative
# ---------------------------------------------------------------------------
_NARRATIVE_SYSTEM = """You are a materials-sustainability analyst. You are given a JSON object with the
results of a bill-of-materials swap analysis that has ALREADY been computed by a
deterministic engine. Write a concise briefing (3-5 sentences, plain prose — no
markdown, no headings, no bullet points) for an engineer or procurement reviewer.

Rules:
- Use ONLY the numbers and facts in the JSON. Never invent, round differently, or
  estimate any figure.
- Lead with the headline outcome: embodied carbon saved and the cost impact.
- Name one or two of the strongest component swaps by name.
- If any component has status "red" it was flagged and kept as-is — say so and
  give the rejection reason from the data. This honesty is the whole point; do
  not gloss over it.
- Neutral, factual tone. No emoji, no salesy language."""


def _narrative_facts(bom, weights, product_name):
    res = analyze_bom(bom, weights)
    s = res["summary"]
    components = []
    for l in res["lines"]:
        rej = l["rejected"][0] if (l["status"] == "red" and l["rejected"]) else None
        components.append({
            "component": l["component"],
            "from": l["from"],
            "to": l["to"],
            "status": l["status"],
            "swapped": l["swapped"],
            "carbon_saved_kg": round(l["co2eFrom"] - l["co2eTo"], 2),
            "cost_delta_usd": round(l["costTo"] - l["costFrom"], 2),
            "note": l["statusReason"],
            "top_rejection": (f"{rej['material']}: {rej['reasons'][0]}" if rej else None),
        })
    carbon = res["weights"]["carbon"]
    return {
        "product": product_name,
        "priority": f"{round(carbon * 100)}% carbon / {round((1 - carbon) * 100)}% cost",
        "summary": {
            "co2e_saved_kg_per_unit": round(s["co2eSaved"], 1),
            "co2e_reduction_pct": s["co2ePct"],
            "cost_delta_usd_per_unit": round(s["costDelta"], 2),
            "cost_increased": s["costUp"],
            "recommended_swaps": s["viableCount"],
            "flagged_components": s["flaggedCount"],
            "eco_score": s["ecoScore"],
            "eco_grade": s["ecoGrade"],
        },
        "components": components,
    }


def generate_narrative(bom, weights=None, product_name="This build"):
    facts = _narrative_facts(bom, weights or {"carbon": 0.6}, product_name)
    msg = client().messages.create(
        model=MODEL,
        max_tokens=1024,
        system=_NARRATIVE_SYSTEM,
        messages=[{"role": "user", "content": json.dumps(facts, ensure_ascii=False)}],
    )
    return "".join(b.text for b in msg.content if b.type == "text").strip()


# ---------------------------------------------------------------------------
# 2) BOM extraction from arbitrary files
# ---------------------------------------------------------------------------
_KNOWN = [d["name"] for d in DATA]
_NORM = {re.sub(r"[^a-z0-9]", "", n.lower()): n for n in _KNOWN}

_IMAGE_TYPES = {
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "gif": "image/gif", "webp": "image/webp",
}


def _match_material(raw):
    """Resolve a model-supplied material name to a canonical library entry, or None."""
    if not raw:
        return None
    return _NORM.get(re.sub(r"[^a-z0-9]", "", str(raw).lower()))


def _pretty_product(filename):
    stem = re.sub(r"\.[^.]+$", "", filename or "Uploaded BOM")
    stem = re.sub(r"[_\-]+", " ", stem).strip()
    return (stem.title() or "Uploaded BOM")


def _xlsx_to_text(data):
    import openpyxl  # imported lazily so a missing dep only affects .xlsx uploads
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    lines = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            lines.append(",".join("" if c is None else str(c) for c in row))
    return "\n".join(lines)


def _content_block(data, filename):
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext in _IMAGE_TYPES:
        return {"type": "image", "source": {"type": "base64", "media_type": _IMAGE_TYPES[ext],
                                            "data": base64.standard_b64encode(data).decode()}}
    if ext == "pdf":
        return {"type": "document", "source": {"type": "base64", "media_type": "application/pdf",
                                               "data": base64.standard_b64encode(data).decode()}}
    if ext == "xlsx":
        return {"type": "text", "text": _xlsx_to_text(data)}
    if ext == "xls":
        raise ValueError("Legacy .xls isn't supported — export as .xlsx or CSV.")
    try:
        return {"type": "text", "text": data.decode("utf-8-sig")}
    except UnicodeDecodeError:
        raise ValueError("Unsupported or unreadable file type. Use CSV, Excel, PDF, or an image.")


def _extract_json(text):
    """Parse the model's JSON reply, tolerating stray prose or code fences."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        raise


def extract_bom(data, filename):
    block = _content_block(data, filename)
    system = (
        "You extract a bill of materials from the provided file, which may be a photo, "
        "a scanned PDF, a spreadsheet dump, or CSV text. For every line item, capture the "
        "component name, its material, and the mass in kilograms.\n\n"
        "Map each material to the SINGLE closest name from this library, copying the name "
        "EXACTLY (including underscores/casing):\n" + ", ".join(_KNOWN) + "\n\n"
        "If a line's material clearly matches none of these, use \"unknown\". Convert masses "
        "to kilograms (e.g. 500 g -> 0.5, 2 lb -> 0.91). If a mass is missing, use 0. Ignore "
        "header rows, subtotals, totals, and any non-material lines.\n\n"
        "Respond with ONLY a JSON object of this exact shape and nothing else:\n"
        "{\"product_name\": string, \"lines\": [{\"component\": string, \"material\": string, \"kg\": number}]}"
    )
    msg = client().messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": [
            block,
            {"type": "text", "text": "Extract the bill of materials now as the specified JSON."},
        ]}],
    )
    text = next((b.text for b in msg.content if b.type == "text"), "{}")
    parsed = _extract_json(text)

    rows, warnings = [], []
    for item in parsed.get("lines", []):
        component = (str(item.get("component") or "").strip() or f"Component {len(rows) + 1}")
        canon = _match_material(item.get("material"))
        if not canon:
            warnings.append(f'"{item.get("material")}" (for {component}) isn\'t in the material library — skipped.')
            continue
        try:
            kg = float(item.get("kg") or 0)
        except (TypeError, ValueError):
            kg = 0
        if kg <= 0:
            warnings.append(f"{component}: missing or invalid mass — defaulted to 1 kg.")
            kg = 1
        rows.append({"component": component, "from": canon, "kg": round(kg, 3)})

    if not rows and not warnings:
        warnings.append("No bill-of-materials rows could be read from this file.")

    product = (str(parsed.get("product_name") or "").strip() or _pretty_product(filename))
    return {
        "rows": rows,
        "warnings": warnings,
        "meta": {
            "productName": product,
            "componentCount": len(rows),
            "totalKg": round(sum(r["kg"] for r in rows), 3),
            "note": f"extracted from {filename} with AI",
        },
    }
