"""Compares parsed BOM rows (from parse.parse_csv) against the reference CSVs
in backend/data (component_library.csv, material_library.csv), and can send
that comparison to an OpenAI agent for a sustainability assessment."""

import csv
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def list_data_csvs() -> list[str]:
    """List CSV filenames available in the backend/data reference folder."""
    return sorted(p.name for p in DATA_DIR.glob("*.csv"))


def load_data_csv(filename: str) -> list[dict]:
    """Load a reference CSV from backend/data by filename."""
    with (DATA_DIR / filename).open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def _matches(name: str, entry: dict, name_field: str) -> bool:
    name = name.strip().lower()
    if not name:
        return False
    if name == entry[name_field].strip().lower():
        return True
    aliases = [a.strip().lower() for a in entry.get("aliases", "").split(";")]
    return name in aliases


def compare_with_library(parsed_rows: list[dict]) -> list[dict]:
    """Match each parsed BOM row's component/material against the reference
    CSVs in backend/data, flagging whether each is a known entry."""
    components = load_data_csv("component_library.csv")
    materials = load_data_csv("material_library.csv")

    results = []
    for row in parsed_rows:
        component_match = next(
            (c for c in components if _matches(row.get("component", ""), c, "component_type")),
            None,
        )
        material_match = next(
            (m for m in materials if _matches(row.get("material", ""), m, "material_name")),
            None,
        )
        results.append({
            **row,
            "component_known": component_match is not None,
            "material_known": material_match is not None,
        })
    return results


def _build_analysis_prompt(comparison: list[dict]) -> str:
    return (
        "You are a sustainability analyst reviewing a bill of materials (BOM).\n"
        "Each row lists a component, its material, and whether that component/material "
        "is recognised in our reference library (component_known / material_known).\n\n"
        f"{json.dumps(comparison, indent=2)}\n\n"
        "Based on this data, respond with a JSON object containing:\n"
        '  "sustainability_score": 0-100,\n'
        '  "recyclability_score": 0-100,\n'
        '  "longevity_score": 0-100,\n'
        '  "summary": a short overall conclusion,\n'
        '  "alternative_materials": a list of objects with "component", '
        '"current_material", "suggested_material", and "reason", only where a '
        "lower-impact swap applies.\n"
        "Respond with JSON only, no other text."
    )


def analyze_with_ai(parsed_rows: list[dict], model: str = "gpt-4o-mini") -> dict:
    """Compare parsed BOM rows against the reference library, then ask an OpenAI
    agent to conclude sustainability, recyclability, and longevity scores plus
    alternative material suggestions."""
    comparison = compare_with_library(parsed_rows)

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": _build_analysis_prompt(comparison)}],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
