// Material library + demo bill of materials for MaterialSwap.
//
// The dataset mirrors the sourced property/carbon data used across the app:
// density, tensile strength, service temperature, cost, embodied carbon,
// recyclability, durability, outdoor/food suitability, plus a primary source
// URL and a note explaining how each figure was derived (and which are
// estimated vs. sourced).

export const DATA = [
  { name: 'aluminum_6061', category: 'metal', density: 2700, tensile_strength_mpa: 310, max_temp_c: 170, cost_per_kg: 4.5, co2e_per_kg: 11.5, recyclability_score: 0.95, durability_years: 30, outdoor_safe: true, food_safe: false, source_url: 'https://greencalculus.com/standards/ice-database-embodied-carbon/', source_note: "CO2e: ICE database lists primary/virgin aluminium at >13 kg CO2e/kg; 11.5 used as a mid figure for wrought 6061 with typical low recycled content. Tensile 310 MPa = 6061-T6 (MatWeb-standard). Cost ~mid-2026 extrusion grade, approximate. Recyclability 0.95: mono-material metal, widely recycled with minimal property loss." },
  { name: 'steel', category: 'metal', density: 7850, tensile_strength_mpa: 400, max_temp_c: 425, cost_per_kg: 0.9, co2e_per_kg: 2.97, recyclability_score: 0.9, durability_years: 30, outdoor_safe: false, food_safe: false, source_url: 'https://www.mdpi.com/2071-1050/13/14/7988', source_note: "CO2e 2.97 = ICE 'Steel, general' (cradle-to-gate). Tensile 400 MPa = structural mild steel (MatWeb-standard). Cost ~mid-2026 hot-rolled structural, approximate. Recyclability 0.90: mono-material, widely recycled. outdoor_safe false: uncoated mild steel corrodes without a protective finish." },
  { name: 'recycled_steel', category: 'metal', density: 7850, tensile_strength_mpa: 450, max_temp_c: 425, cost_per_kg: 0.5, co2e_per_kg: 0.68, recyclability_score: 0.9, durability_years: 30, outdoor_safe: false, food_safe: false, source_url: 'https://greencalculus.com/standards/ice-database-embodied-carbon/', source_note: 'CO2e 0.68 estimated: ICE/greencalculus note secondary (EAF) steel is roughly one-fifth of primary steel intensity (~2.97/5). Tensile ~450 MPa typical EAF rebar/section (MatWeb-standard). Cost ~mid-2026 scrap-based, approximate. Recyclability 0.90: mono-material, widely recycled.' },
  { name: 'recycled_aluminum', category: 'metal', density: 2700, tensile_strength_mpa: 250, max_temp_c: 170, cost_per_kg: 2.2, co2e_per_kg: 0.55, recyclability_score: 0.95, durability_years: 30, outdoor_safe: true, food_safe: false, source_url: 'https://greencalculus.com/standards/ice-database-embodied-carbon/', source_note: 'CO2e 0.55 estimated: greencalculus/ICE note secondary aluminium is ~4% of primary (~13 x 0.04). Tensile ~250 MPa typical recycled cast/wrought (MatWeb-standard, estimated). Cost ~mid-2026, approximate. Recyclability 0.95: mono-material metal, widely recycled.' },
  { name: 'ABS', category: 'plastic', density: 1050, tensile_strength_mpa: 43, max_temp_c: 85, cost_per_kg: 2.5, co2e_per_kg: 3.4, recyclability_score: 0.5, durability_years: 15, outdoor_safe: false, food_safe: false, source_url: 'https://www.sciencedirect.com/science/article/pii/S2352550924001507', source_note: 'CO2e 3.40 estimated: literature cradle-to-gate resin values ~2.5-4 kg CO2e/kg; exact figure not pinned to a single source here. Tensile ~43 MPa, max service ~85C (MatWeb-standard). Cost ~mid-2026 resin, approximate. Recyclability 0.50: mono thermoplastic (#7) but limited curbside recycling infrastructure.' },
  { name: 'polypropylene', category: 'plastic', density: 905, tensile_strength_mpa: 33, max_temp_c: 100, cost_per_kg: 1.5, co2e_per_kg: 2.0, recyclability_score: 0.6, durability_years: 12, outdoor_safe: false, food_safe: true, source_url: 'https://www.sciencedirect.com/science/article/pii/S2352550924001507', source_note: 'CO2e 2.00 estimated: PlasticsEurope/literature cradle-to-gate ~1.9-2.1 kg CO2e/kg. Tensile ~33 MPa, max service ~100C (MatWeb-standard). Cost ~mid-2026 resin, approximate. food_safe true: PP (#5) is a common food-contact polymer. Recyclability 0.60: mono #5, recycling growing but infrastructure still limited.' },
  { name: 'PET', category: 'plastic', density: 1380, tensile_strength_mpa: 55, max_temp_c: 70, cost_per_kg: 1.4, co2e_per_kg: 2.15, recyclability_score: 0.85, durability_years: 10, outdoor_safe: false, food_safe: true, source_url: 'https://www.sciencedirect.com/science/article/pii/S2352550924001507', source_note: 'CO2e 2.15 estimated: virgin PET cradle-to-gate ~2.1-3.0 kg CO2e/kg. Tensile ~55 MPa, max service ~70C (MatWeb-standard). Cost ~mid-2026 resin, approximate. food_safe true: PET (#1) widely used for food/drink packaging. Recyclability 0.85: mono #1, widely collected and recycled.' },
  { name: 'recycled_PET', category: 'plastic', density: 1380, tensile_strength_mpa: 50, max_temp_c: 70, cost_per_kg: 1.3, co2e_per_kg: 0.8, recyclability_score: 0.85, durability_years: 8, outdoor_safe: false, food_safe: true, source_url: 'https://www.sciencedirect.com/science/article/pii/S2352550924001507', source_note: 'CO2e 0.80 estimated: rPET reported as lowest-GWP polymer at cradle-to-gate resin in the cited meta-analysis (typ. ~0.45-1.1). Tensile ~50 MPa (MatWeb-standard, slightly below virgin). Cost ~mid-2026, approximate. food_safe true: food-grade rPET is established. Recyclability 0.85: mono #1, widely recycled.' },
  { name: 'bamboo_composite', category: 'biocomposite', density: 700, tensile_strength_mpa: 120, max_temp_c: 70, cost_per_kg: 3.5, co2e_per_kg: 1.1, recyclability_score: 0.25, durability_years: 15, outdoor_safe: false, food_safe: false, source_url: 'https://www.mdpi.com/2079-6439/8/10/62', source_note: 'CO2e 1.10 estimated: bamboo fibre is near-carbon-neutral but resin binder raises composite footprint; no single sourced figure. Tensile ~120 MPa estimated for strand/fibre composite. Cost ~mid-2026, approximate. Recyclability 0.25: resin-bonded composite, hard to separate. source_url is a natural-fibre-composite mechanical reference, not bamboo-specific.' },
  { name: 'FSC_plywood', category: 'wood', density: 600, tensile_strength_mpa: 30, max_temp_c: 50, cost_per_kg: 1.2, co2e_per_kg: 0.68, recyclability_score: 0.3, durability_years: 20, outdoor_safe: false, food_safe: false, source_url: 'https://www.istructe.org/IStructE/media/Public/Resources/ARUP-Embodied-carbon-timber-v2.pdf', source_note: 'CO2e 0.68 = ICE plywood (includes adhesive), cradle-to-gate, fossil-only (biogenic reported separately). Tensile ~30 MPa parallel-to-grain estimated. Cost ~mid-2026 interior-grade FSC sheet, approximate. Recyclability 0.30: glue-bonded laminate, difficult to recycle. outdoor_safe false: interior-grade adhesive.' },
  { name: 'oak', category: 'wood', density: 710, tensile_strength_mpa: 90, max_temp_c: 60, cost_per_kg: 4.0, co2e_per_kg: 0.46, recyclability_score: 0.7, durability_years: 40, outdoor_safe: true, food_safe: true, source_url: 'https://greencalculus.com/standards/ice-database-embodied-carbon/', source_note: 'CO2e 0.46 estimated: ICE/greencalculus structural timber ~0.3-0.5 kg CO2e/kg (fossil-only; biogenic storage separate). Tensile ~90 MPa parallel-to-grain for oak (MatWeb/wood-handbook standard). Cost ~mid-2026 sawn hardwood, approximate. Recyclability 0.70: mono natural material, reusable/downcyclable but limited formal recycling stream. food_safe true: oak used for boards/cooperage.' },
  { name: 'cork', category: 'natural', density: 160, tensile_strength_mpa: 1.5, max_temp_c: 120, cost_per_kg: 6.0, co2e_per_kg: 0.8, recyclability_score: 0.6, durability_years: 15, outdoor_safe: true, food_safe: true, source_url: 'https://www.sciencedirect.com/science/article/pii/S2666789421000246', source_note: 'CO2e 0.80 estimated: expanded cork agglomerate shows high data variability in the cited insulation LCA review; treat as indicative. Tensile ~1.5 MPa estimated (cork is weak in tension, used in compression). Cost ~mid-2026, approximate. Recyclability 0.60: mono natural material, limited recycling infrastructure. food_safe true: cork used for wine stoppers/food contact.' },
  { name: 'hemp_composite', category: 'biocomposite', density: 1200, tensile_strength_mpa: 35, max_temp_c: 120, cost_per_kg: 5.0, co2e_per_kg: 1.5, recyclability_score: 0.2, durability_years: 15, outdoor_safe: false, food_safe: false, source_url: 'https://www.mdpi.com/2079-6439/8/10/62', source_note: 'Tensile 35 MPa = mean for hemp/epoxy bidirectional composite in cited study (35.3 MPa). CO2e 1.50 estimated: hemp fibre is low-carbon but epoxy matrix dominates; no single sourced composite figure. Cost ~mid-2026, approximate. Recyclability 0.20: thermoset-bonded composite, not recyclable.' },
  { name: 'PLA', category: 'bioplastic', density: 1250, tensile_strength_mpa: 50, max_temp_c: 55, cost_per_kg: 3.0, co2e_per_kg: 1.63, recyclability_score: 0.5, durability_years: 5, outdoor_safe: false, food_safe: true, source_url: 'https://www.sciencedirect.com/science/article/pii/S2352550924001507', source_note: 'CO2e 1.63 = median cradle-to-gate resin GWP from meta-analysis of 80+ PLA LCA studies. Tensile ~47-70 MPa (Granta/QMUL datasheet); 50 used. max_temp 55C: low HDT / Tg 55-65C. Cost ~mid-2026 pellets, approximate. food_safe true: PLA used in food packaging. Recyclability 0.50: mono-material but needs industrial composting/dedicated stream, not curbside.' },
  { name: 'glass_fiber_composite', category: 'composite', density: 1900, tensile_strength_mpa: 440, max_temp_c: 150, cost_per_kg: 5.0, co2e_per_kg: 5.0, recyclability_score: 0.1, durability_years: 25, outdoor_safe: true, food_safe: false, source_url: 'https://www.mdpi.com/2079-6439/8/10/62', source_note: 'Tensile 440 MPa: cited study reports 484 MPa for glass/epoxy bidirectional laminate; 440 used as conservative mean. CO2e 5.00 estimated: GFRP cradle-to-gate typically ~2.6-8 kg CO2e/kg (fibre + resin), no single sourced value. Cost ~mid-2026, approximate. Recyclability 0.10: thermoset composite, effectively non-recyclable.' },
  { name: 'flax_fiber_composite', category: 'biocomposite', density: 1300, tensile_strength_mpa: 70, max_temp_c: 130, cost_per_kg: 7.0, co2e_per_kg: 1.5, recyclability_score: 0.2, durability_years: 15, outdoor_safe: false, food_safe: false, source_url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6981686/', source_note: 'Tensile 70 MPa = plain flax/epoxy composite (cited study: 68.12 MPa). CO2e 1.50 estimated: flax fibre is low-carbon but epoxy matrix dominates; no single sourced composite figure. Cost ~mid-2026, approximate. Recyclability 0.20: thermoset-bonded composite, not recyclable.' },
  { name: 'mycelium_foam', category: 'natural', density: 100, tensile_strength_mpa: 0.2, max_temp_c: 120, cost_per_kg: 3.0, co2e_per_kg: 0.4, recyclability_score: 0.7, durability_years: 5, outdoor_safe: false, food_safe: false, source_url: 'https://www.fiberjournal.com/mycelium-based-biomaterials/', source_note: 'CO2e 0.40: cited review reports embodied carbon <0.5 kg CO2e/kg for mycelium grown on waste (can be carbon-negative on a cradle-to-gate basis). Tensile ~0.2 MPa estimated (foam is weak in tension, used in compression/packaging). Cost ~mid-2026, approximate. Recyclability 0.70: mono bio-material, home/industrial compostable though not part of a recycling stream. outdoor_safe false: moisture-sensitive.' },
  { name: 'wool_felt', category: 'natural', density: 300, tensile_strength_mpa: 4, max_temp_c: 140, cost_per_kg: 12.0, co2e_per_kg: 2.9, recyclability_score: 0.6, durability_years: 15, outdoor_safe: false, food_safe: false, source_url: 'https://historicengland.org.uk/research/heritage-counts/heritage-and-environment/avoiding-embodied-carbon-production/construction-materials-embodied-carbon/', source_note: 'CO2e 2.90 estimated: processed wool textile/felt values vary widely (~1-6 kg CO2e/kg depending on farming allocation and scouring); treat as indicative. Tensile ~4 MPa estimated (nonwoven felt, low tensile). Cost ~mid-2026 industrial felt, approximate. Recyclability 0.60: mono natural fibre, biodegradable but limited recycling infrastructure. source_url is a general embodied-carbon reference, not wool-specific.' },
]

// Demo bill of materials — an ergonomic task chair, each component mapped from a
// baseline material to a lower-carbon swap.
export const BOM = [
  { component: 'Base column', from: 'steel', to: 'recycled_steel', kg: 2.4 },
  { component: 'Support frame', from: 'aluminum_6061', to: 'recycled_aluminum', kg: 1.8 },
  { component: 'Seat shell', from: 'ABS', to: 'recycled_PET', kg: 1.2 },
  { component: 'Backrest panel', from: 'ABS', to: 'recycled_PET', kg: 0.9 },
  { component: 'Cushion backing', from: 'PET', to: 'wool_felt', kg: 0.6 },
  { component: 'Fasteners & brackets', from: 'steel', to: 'recycled_steel', kg: 0.3 },
]

export const CAT_COLORS = {
  metal: '#475569',
  plastic: '#B45309',
  bioplastic: '#0E7490',
  wood: '#92400E',
  natural: '#15803D',
  biocomposite: '#4338CA',
  composite: '#9F1239',
}

export const CATEGORIES = ['all', 'metal', 'plastic', 'bioplastic', 'wood', 'natural', 'biocomposite', 'composite']

export function mat(name) {
  return DATA.find((d) => d.name === name)
}

export function co2eColor(v) {
  return v <= 1 ? '#15803D' : v <= 3 ? '#B45309' : '#B91C1C'
}

export function recycColor(v) {
  return v >= 0.7 ? '#16A34A' : v >= 0.45 ? '#CA8A04' : '#DC2626'
}

export function fmtCost(v) {
  return '$' + v.toFixed(2)
}

// Build a CSV string of the full material library for the download buttons.
export function datasetCsv() {
  const cols = [
    'name', 'category', 'density', 'tensile_strength_mpa', 'max_temp_c',
    'cost_per_kg', 'co2e_per_kg', 'recyclability_score', 'durability_years',
    'outdoor_safe', 'food_safe', 'source_url', 'source_note',
  ]
  const esc = (v) => {
    const s = String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [cols.join(',')]
  for (const d of DATA) lines.push(cols.map((c) => esc(d[c])).join(','))
  return lines.join('\n')
}
