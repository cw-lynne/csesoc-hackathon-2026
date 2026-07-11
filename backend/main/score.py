"""Swap-analysis engine — the Python port of the frontend's analysis.js.

`analyze_bom(bom, weights)` is what POST /analyze-bom returns; the JSON shape is
byte-compatible with the frontend's expectations (camelCase keys, same fields,
same numbers). Rounding uses jround() to match JavaScript's Math.round (round
half toward +infinity), so backend and client-side fallback agree exactly.
"""

import math

from materials import DATA, mat


def jround(x):
    """Match JS Math.round (round half up toward +infinity)."""
    return math.floor(x + 0.5)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


# --- library-wide normalisation ranges (for radar axes) --------------------
def _range_of(key):
    vals = [d[key] for d in DATA if d.get(key) is not None]
    return {"min": min(vals), "max": max(vals)}


RANGES = {
    "co2e": _range_of("co2e_per_kg"),
    "cost": _range_of("cost_per_kg"),
    "durability": _range_of("durability_years"),
}


def _norm01(v, r):
    return 0.5 if r["max"] == r["min"] else (v - r["min"]) / (r["max"] - r["min"])


def radar_axes(m):
    """Four radar axes, 0-100 where higher = better."""
    return {
        "carbon": jround((1 - _norm01(m["co2e_per_kg"], RANGES["co2e"])) * 100),
        "cost": jround((1 - _norm01(m["cost_per_kg"], RANGES["cost"])) * 100),
        "durability": jround(_norm01(m["durability_years"], RANGES["durability"]) * 100),
        "recyclability": jround(m["recyclability_score"] * 100),
    }


def radar_series(original, candidate):
    o = radar_axes(original)
    c = radar_axes(candidate) if candidate else None
    return [
        {"axis": "Carbon", "original": o["carbon"], "suggestion": (c["carbon"] if c else None)},
        {"axis": "Cost", "original": o["cost"], "suggestion": (c["cost"] if c else None)},
        {"axis": "Durability", "original": o["durability"], "suggestion": (c["durability"] if c else None)},
        {"axis": "Recyclability", "original": o["recyclability"], "suggestion": (c["recyclability"] if c else None)},
    ]


# --- requirements ----------------------------------------------------------
def requirements_for(line, f):
    req = line.get("req")
    if req:
        return {
            "tensile": req.get("tensile", 0),
            "maxTemp": req.get("maxTemp", float("-inf")),
            "foodSafe": bool(req.get("foodSafe")),
            "outdoorSafe": bool(req.get("outdoorSafe")),
            "derived": False,
        }
    return {
        "tensile": round(f["tensile_strength_mpa"] * 0.6, 1),
        "maxTemp": f["max_temp_c"],
        "foodSafe": f["food_safe"],
        "outdoorSafe": f["outdoor_safe"],
        "derived": True,
    }


def _fmt_num(n):
    """Render like JS: drop a trailing .0 so 480.0 -> '480'."""
    return str(int(n)) if float(n) == int(n) else str(n)


def requirement_summary(reqs):
    parts = []
    if reqs["tensile"] > 0:
        parts.append(f"≥ {_fmt_num(reqs['tensile'])} MPa tensile")
    if reqs["maxTemp"] > float("-inf"):
        parts.append(f"≥ {_fmt_num(reqs['maxTemp'])}°C service")
    if reqs["foodSafe"]:
        parts.append("food-contact safe")
    if reqs["outdoorSafe"]:
        parts.append("outdoor-rated")
    return " · ".join(parts) or "no hard constraints"


def rejection_reasons(cand, reqs):
    reasons = []
    if cand["tensile_strength_mpa"] < reqs["tensile"]:
        reasons.append(f"tensile strength {_fmt_num(cand['tensile_strength_mpa'])} MPa < required {_fmt_num(reqs['tensile'])} MPa")
    if cand["max_temp_c"] < reqs["maxTemp"]:
        reasons.append(f"max service temp {_fmt_num(cand['max_temp_c'])}°C < required {_fmt_num(reqs['maxTemp'])}°C")
    if reqs["foodSafe"] and not cand["food_safe"]:
        reasons.append("not food-contact safe (required for this part)")
    if reqs["outdoorSafe"] and not cand["outdoor_safe"]:
        reasons.append("not rated for outdoor use (required for this part)")
    return reasons


# --- scoring ---------------------------------------------------------------
def _affinity(cand, f):
    return 0.35 if cand["category"] == f["category"] else 0


def _base_material(name):
    """The base material a name refers to, ignoring a recycled_ prefix / grade
    suffix — so 'aluminum_6061' and 'recycled_aluminum' share base 'aluminum'."""
    return name.replace("recycled_", "", 1).split("_")[0].lower() if name else ""


def _same_material(cand, f):
    """Strong preference for recycling the SAME material (e.g. aluminium →
    recycled aluminium) over switching to a different one — the intuitive swap."""
    return 0.5 if _base_material(cand["name"]) == _base_material(f["name"]) else 0


def score_candidate(cand, f, carbon_weight):
    carbon_gain = clamp((f["co2e_per_kg"] - cand["co2e_per_kg"]) / f["co2e_per_kg"], -1, 1)
    cost_gain = clamp((f["cost_per_kg"] - cand["cost_per_kg"]) / f["cost_per_kg"], -1, 1)
    recyc_gain = cand["recyclability_score"] - f["recyclability_score"]
    dur_gain = clamp((cand["durability_years"] - f["durability_years"]) / max(f["durability_years"], 1), -1, 1)
    w = carbon_weight
    return w * carbon_gain + (1 - w) * cost_gain + 0.15 * recyc_gain + 0.05 * dur_gain + _affinity(cand, f) + _same_material(cand, f)


def pros_cons_for(f, t):
    pros, cons = [], []
    if not f or not t:
        return {"pros": pros, "cons": cons}

    co2e_cut = jround((1 - t["co2e_per_kg"] / f["co2e_per_kg"]) * 100)
    if co2e_cut >= 5:
        pros.append(f"{co2e_cut}% lower embodied carbon per kg")
    elif co2e_cut <= -5:
        cons.append(f"{abs(co2e_cut)}% higher embodied carbon per kg")

    cost_delta_pct = jround((t["cost_per_kg"] / f["cost_per_kg"] - 1) * 100)
    if cost_delta_pct <= -5:
        pros.append(f"Lower material cost ({cost_delta_pct}%/kg)")
    elif cost_delta_pct >= 5:
        cons.append(f"Higher material cost (+{cost_delta_pct}%/kg)")

    recyc_delta = t["recyclability_score"] - f["recyclability_score"]
    if recyc_delta >= 0.08:
        pros.append("More recyclable at end of life")
    elif recyc_delta <= -0.08:
        cons.append("Less recyclable at end of life")

    if t["durability_years"] >= f["durability_years"] + 3:
        pros.append("Longer expected service life")
    elif t["durability_years"] <= f["durability_years"] - 3:
        cons.append("Shorter expected service life")

    tensile_delta_pct = (t["tensile_strength_mpa"] - f["tensile_strength_mpa"]) / f["tensile_strength_mpa"]
    if tensile_delta_pct <= -0.2:
        cons.append("Lower tensile strength than original")
    elif tensile_delta_pct >= 0.2:
        pros.append("Higher tensile strength than original")

    if t["max_temp_c"] <= f["max_temp_c"] - 30:
        cons.append("Lower maximum service temperature")
    if f["food_safe"] and not t["food_safe"]:
        cons.append("No longer food-contact safe")
    if f["outdoor_safe"] and not t["outdoor_safe"]:
        cons.append("No longer rated for outdoor use")

    return {"pros": pros[:3], "cons": cons[:2]}


def _cand_row(cand, f, carbon_weight, status, reasons=None):
    return {
        "material": cand["name"],
        "category": cand["category"],
        "source": cand.get("source"),
        "co2e": cand["co2e_per_kg"],
        "cost": cand["cost_per_kg"],
        "recyclability": cand["recyclability_score"],
        "tensile": cand["tensile_strength_mpa"],
        "score": score_candidate(cand, f, carbon_weight),
        "status": status,
        "reasons": reasons or [],
    }


# --- per-line analysis -----------------------------------------------------
def analyze_line(line, carbon_weight):
    f = mat(line["from"])
    kg = line["kg"]
    reqs = requirements_for(line, f)

    viable, rejected = [], []
    for cand in DATA:
        if cand["name"] == f["name"]:
            continue
        reasons = rejection_reasons(cand, reqs)
        if reasons:
            rejected.append(_cand_row(cand, f, carbon_weight, "rejected", reasons))
        else:
            viable.append(_cand_row(cand, f, carbon_weight, "viable"))
    viable.sort(key=lambda a: a["score"], reverse=True)
    rejected.sort(key=lambda a: a["co2e"])

    top = viable[0] if viable else None
    if not top:
        status = "red"
        suggestion = None
        status_reason = "No viable alternative — every lower-impact candidate fails a functional requirement."
    elif top["score"] <= 0:
        status = "yellow"
        suggestion = None
        status_reason = "Original is already the best available choice under these priorities."
    else:
        suggestion = top
        carbon_cut = (f["co2e_per_kg"] - top["co2e"]) / f["co2e_per_kg"]
        cost_delta = (top["cost"] - f["cost_per_kg"]) / f["cost_per_kg"]
        if carbon_cut >= 0.10 and cost_delta <= 0.15:
            status = "green"
            status_reason = "Strong swap: meaningfully lower carbon within cost tolerance."
        else:
            status = "yellow"
            status_reason = (
                "Viable swap, but at a cost premium worth reviewing."
                if cost_delta > 0.15
                else "Viable swap with a modest carbon gain."
            )

    t = mat(suggestion["material"]) if suggestion else f
    pc = pros_cons_for(f, t) if suggestion else {"pros": [], "cons": []}

    return {
        "component": line["component"],
        "kg": kg,
        "from": f["name"],
        "requirements": reqs,
        "requirementText": requirement_summary(reqs),
        "status": status,
        "statusReason": status_reason,
        "swapped": bool(suggestion),
        "suggestion": suggestion,
        "to": t["name"],
        "viable": viable,
        "rejected": rejected,
        "pros": pc["pros"],
        "cons": pc["cons"],
        "radar": radar_series(f, t if suggestion else None),
        "costFrom": f["cost_per_kg"] * kg,
        "costTo": t["cost_per_kg"] * kg,
        "co2eFrom": f["co2e_per_kg"] * kg,
        "co2eTo": t["co2e_per_kg"] * kg,
        "recycFrom": f["recyclability_score"],
        "recycTo": t["recyclability_score"],
    }


# --- summary roll-up -------------------------------------------------------
def _summarise(lines):
    cost_from = cost_to = co2e_from = co2e_to = recyc_from = recyc_to = 0.0
    green = yellow = red = swap_count = 0
    for l in lines:
        cost_from += l["costFrom"]; cost_to += l["costTo"]
        co2e_from += l["co2eFrom"]; co2e_to += l["co2eTo"]
        recyc_from += l["recycFrom"]; recyc_to += l["recycTo"]
        if l["status"] == "green":
            green += 1
        elif l["status"] == "yellow":
            yellow += 1
        else:
            red += 1
        if l["swapped"]:
            swap_count += 1

    n = len(lines) or 1
    co2e_saved = co2e_from - co2e_to
    co2e_pct = jround((1 - co2e_to / (co2e_from or 1)) * 100)
    cost_delta = cost_to - cost_from
    recyc_pts = jround((recyc_to / n - recyc_from / n) * 100)

    cost_up = cost_delta > 0
    eco_score = jround(55 + co2e_pct * 0.32 + recyc_pts * 0.22 + (-6 if cost_up else 6) - red * 4)
    eco_score = max(0, min(99, eco_score))
    eco_grade = "A" if eco_score >= 90 else "B" if eco_score >= 75 else "C" if eco_score >= 60 else "D" if eco_score >= 45 else "F"

    return {
        "costFrom": cost_from, "costTo": cost_to, "costDelta": cost_delta, "costUp": cost_up,
        "co2eFrom": co2e_from, "co2eTo": co2e_to, "co2eSaved": co2e_saved, "co2ePct": co2e_pct,
        "recycFrom": recyc_from / n, "recycTo": recyc_to / n, "recycPts": recyc_pts,
        "green": green, "yellow": yellow, "red": red,
        "viableCount": swap_count,
        "flaggedCount": red,
        "keptCount": len(lines) - swap_count - red,
        "ecoScore": eco_score, "ecoGrade": eco_grade,
    }


# --- public entry point ----------------------------------------------------
def analyze_bom(bom, weights=None):
    """weights['carbon'] in [0,1] is the priority-slider position."""
    weights = weights or {}
    carbon_weight = clamp(weights.get("carbon", 0.6), 0, 1)
    lines = [analyze_line(line, carbon_weight) for line in bom]
    summary = _summarise(lines)
    return {"weights": {"carbon": carbon_weight}, "lines": lines, "summary": summary}
