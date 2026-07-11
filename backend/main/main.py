"""Compares parsed BOM rows (from parse.parse_csv) against the reference CSVs
in backend/data (component_library.csv, material_library.csv), flagging whether
each component/material is a known entry in the reference library."""

import csv
from pathlib import Path

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
