"""Material library + demo bill of materials (Python mirror of the frontend's
materials.js). Only the fields the scoring engine needs are carried here; the
rich source notes / URLs live in the frontend library view.

Every numeric field is sourced/estimated as documented in materials.js. The
Materiom entries carry source='materiom' and their figures are indicative.
"""

# name, category, tensile_strength_mpa, max_temp_c, cost_per_kg, co2e_per_kg,
# recyclability_score, durability_years, outdoor_safe, food_safe, source
DATA = [
    {"name": "aluminum_6061", "category": "metal", "tensile_strength_mpa": 310, "max_temp_c": 170, "cost_per_kg": 4.5, "co2e_per_kg": 11.5, "recyclability_score": 0.95, "durability_years": 30, "outdoor_safe": True, "food_safe": False},
    {"name": "steel", "category": "metal", "tensile_strength_mpa": 400, "max_temp_c": 425, "cost_per_kg": 0.9, "co2e_per_kg": 2.97, "recyclability_score": 0.9, "durability_years": 30, "outdoor_safe": False, "food_safe": False},
    {"name": "recycled_steel", "category": "metal", "tensile_strength_mpa": 450, "max_temp_c": 425, "cost_per_kg": 0.5, "co2e_per_kg": 0.68, "recyclability_score": 0.9, "durability_years": 30, "outdoor_safe": False, "food_safe": False},
    {"name": "recycled_aluminum", "category": "metal", "tensile_strength_mpa": 250, "max_temp_c": 170, "cost_per_kg": 2.2, "co2e_per_kg": 0.55, "recyclability_score": 0.95, "durability_years": 30, "outdoor_safe": True, "food_safe": False},
    {"name": "ABS", "category": "plastic", "tensile_strength_mpa": 43, "max_temp_c": 85, "cost_per_kg": 2.5, "co2e_per_kg": 3.4, "recyclability_score": 0.5, "durability_years": 15, "outdoor_safe": False, "food_safe": False},
    {"name": "polypropylene", "category": "plastic", "tensile_strength_mpa": 33, "max_temp_c": 100, "cost_per_kg": 1.5, "co2e_per_kg": 2.0, "recyclability_score": 0.6, "durability_years": 12, "outdoor_safe": False, "food_safe": True},
    {"name": "PET", "category": "plastic", "tensile_strength_mpa": 55, "max_temp_c": 70, "cost_per_kg": 1.4, "co2e_per_kg": 2.15, "recyclability_score": 0.85, "durability_years": 10, "outdoor_safe": False, "food_safe": True},
    {"name": "recycled_PET", "category": "plastic", "tensile_strength_mpa": 50, "max_temp_c": 70, "cost_per_kg": 1.3, "co2e_per_kg": 0.8, "recyclability_score": 0.85, "durability_years": 8, "outdoor_safe": False, "food_safe": True},
    {"name": "bamboo_composite", "category": "biocomposite", "tensile_strength_mpa": 120, "max_temp_c": 70, "cost_per_kg": 3.5, "co2e_per_kg": 1.1, "recyclability_score": 0.25, "durability_years": 15, "outdoor_safe": False, "food_safe": False},
    {"name": "FSC_plywood", "category": "wood", "tensile_strength_mpa": 30, "max_temp_c": 50, "cost_per_kg": 1.2, "co2e_per_kg": 0.68, "recyclability_score": 0.3, "durability_years": 20, "outdoor_safe": False, "food_safe": False},
    {"name": "oak", "category": "wood", "tensile_strength_mpa": 90, "max_temp_c": 60, "cost_per_kg": 4.0, "co2e_per_kg": 0.46, "recyclability_score": 0.7, "durability_years": 40, "outdoor_safe": True, "food_safe": True},
    {"name": "cork", "category": "natural", "tensile_strength_mpa": 1.5, "max_temp_c": 120, "cost_per_kg": 6.0, "co2e_per_kg": 0.8, "recyclability_score": 0.6, "durability_years": 15, "outdoor_safe": True, "food_safe": True},
    {"name": "hemp_composite", "category": "biocomposite", "tensile_strength_mpa": 35, "max_temp_c": 120, "cost_per_kg": 5.0, "co2e_per_kg": 1.5, "recyclability_score": 0.2, "durability_years": 15, "outdoor_safe": False, "food_safe": False},
    {"name": "PLA", "category": "bioplastic", "tensile_strength_mpa": 50, "max_temp_c": 55, "cost_per_kg": 3.0, "co2e_per_kg": 1.63, "recyclability_score": 0.5, "durability_years": 5, "outdoor_safe": False, "food_safe": True},
    {"name": "glass_fiber_composite", "category": "composite", "tensile_strength_mpa": 440, "max_temp_c": 150, "cost_per_kg": 5.0, "co2e_per_kg": 5.0, "recyclability_score": 0.1, "durability_years": 25, "outdoor_safe": True, "food_safe": False},
    {"name": "flax_fiber_composite", "category": "biocomposite", "tensile_strength_mpa": 70, "max_temp_c": 130, "cost_per_kg": 7.0, "co2e_per_kg": 1.5, "recyclability_score": 0.2, "durability_years": 15, "outdoor_safe": False, "food_safe": False},
    {"name": "mycelium_foam", "category": "natural", "tensile_strength_mpa": 0.2, "max_temp_c": 120, "cost_per_kg": 3.0, "co2e_per_kg": 0.4, "recyclability_score": 0.7, "durability_years": 5, "outdoor_safe": False, "food_safe": False},
    {"name": "wool_felt", "category": "natural", "tensile_strength_mpa": 4, "max_temp_c": 140, "cost_per_kg": 12.0, "co2e_per_kg": 2.9, "recyclability_score": 0.6, "durability_years": 15, "outdoor_safe": False, "food_safe": False},

    # --- Bio-based alternatives from the Materiom Commons (indicative figures) ---
    {"name": "chitosan_bioplastic", "category": "bioplastic", "tensile_strength_mpa": 40, "max_temp_c": 90, "cost_per_kg": 8.0, "co2e_per_kg": 1.2, "recyclability_score": 0.8, "durability_years": 3, "outdoor_safe": False, "food_safe": True, "source": "materiom"},
    {"name": "alginate_bioplastic", "category": "bioplastic", "tensile_strength_mpa": 30, "max_temp_c": 80, "cost_per_kg": 6.0, "co2e_per_kg": 0.9, "recyclability_score": 0.85, "durability_years": 2, "outdoor_safe": False, "food_safe": True, "source": "materiom"},
    {"name": "agar_bioplastic", "category": "bioplastic", "tensile_strength_mpa": 25, "max_temp_c": 80, "cost_per_kg": 9.0, "co2e_per_kg": 1.0, "recyclability_score": 0.85, "durability_years": 2, "outdoor_safe": False, "food_safe": True, "source": "materiom"},
    {"name": "gelatin_bioplastic", "category": "bioplastic", "tensile_strength_mpa": 35, "max_temp_c": 70, "cost_per_kg": 5.0, "co2e_per_kg": 1.3, "recyclability_score": 0.8, "durability_years": 2, "outdoor_safe": False, "food_safe": True, "source": "materiom"},
    {"name": "starch_bioplastic", "category": "bioplastic", "tensile_strength_mpa": 20, "max_temp_c": 75, "cost_per_kg": 2.5, "co2e_per_kg": 1.1, "recyclability_score": 0.85, "durability_years": 2, "outdoor_safe": False, "food_safe": True, "source": "materiom"},
    {"name": "cellulose_biocomposite", "category": "biocomposite", "tensile_strength_mpa": 60, "max_temp_c": 120, "cost_per_kg": 4.0, "co2e_per_kg": 1.0, "recyclability_score": 0.5, "durability_years": 10, "outdoor_safe": False, "food_safe": False, "source": "materiom"},
    {"name": "coffee_ground_composite", "category": "biocomposite", "tensile_strength_mpa": 25, "max_temp_c": 100, "cost_per_kg": 2.0, "co2e_per_kg": 0.7, "recyclability_score": 0.4, "durability_years": 8, "outdoor_safe": False, "food_safe": False, "source": "materiom"},
    {"name": "eggshell_biocomposite", "category": "biocomposite", "tensile_strength_mpa": 30, "max_temp_c": 130, "cost_per_kg": 2.0, "co2e_per_kg": 0.6, "recyclability_score": 0.4, "durability_years": 10, "outdoor_safe": False, "food_safe": False, "source": "materiom"},
    {"name": "bacterial_cellulose", "category": "natural", "tensile_strength_mpa": 20, "max_temp_c": 120, "cost_per_kg": 15.0, "co2e_per_kg": 0.8, "recyclability_score": 0.8, "durability_years": 3, "outdoor_safe": False, "food_safe": False, "source": "materiom"},
]

_BY_NAME = {d["name"]: d for d in DATA}


def mat(name):
    """Look up a material by name, or None."""
    return _BY_NAME.get(name)


# Demo bill of materials — the ergonomic task chair, with per-line functional
# requirements. Mirrors materials.js BOM (keys use the JS names: 'from', 'req'
# with tensile/maxTemp/etc.).
BOM = [
    {"component": "Base column", "from": "steel", "kg": 2.4, "req": {"tensile": 350, "maxTemp": 200}},
    {"component": "Support frame", "from": "aluminum_6061", "kg": 1.8, "req": {"tensile": 200, "maxTemp": 120}},
    {"component": "Seat shell", "from": "ABS", "kg": 1.2, "req": {"tensile": 30, "maxTemp": 60}},
    {"component": "Backrest panel", "from": "ABS", "kg": 0.9, "req": {"tensile": 25, "maxTemp": 60}},
    {"component": "Cushion backing", "from": "PET", "kg": 0.6, "req": {"tensile": 2, "maxTemp": 60}},
    {"component": "Fasteners & brackets", "from": "steel", "kg": 0.3, "req": {"tensile": 400, "maxTemp": 200}},
    {"component": "Caster spindle", "from": "steel", "kg": 0.5, "req": {"tensile": 480, "maxTemp": 200}},
]
