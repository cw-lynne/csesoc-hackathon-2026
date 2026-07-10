// Mock /analyze-bom response for the demo office chair.
//
// Shape matches the API contract in the project brief EXACTLY for the fields the
// contract defines. Two extra, clearly-optional helper blocks are included so the
// radar chart can render before the real backend exists:
//   - component.original  : { co2e_per_kg, cost_per_kg, recyclability_score, durability_years }
//   - suggestion.cost_per_kg (absolute, alongside the contract's cost_delta_pct)
// The backend can populate these later; nothing here relies on them being present.
//
// When Person A ships the real API, delete this file's use in api.js — the shapes
// already line up.

// Every material referenced below, with the raw metrics the radar normalizes against.
// Mirrors the materials CSV schema (subset) so the two stay in sync.
export const MATERIALS = {
  aluminum_6061:            { co2e_per_kg: 8.1,  cost_per_kg: 3.20, recyclability_score: 0.90, durability_years: 20 },
  recycled_aluminum:        { co2e_per_kg: 2.1,  cost_per_kg: 3.05, recyclability_score: 0.95, durability_years: 20 },
  steel:                    { co2e_per_kg: 2.3,  cost_per_kg: 1.10, recyclability_score: 0.88, durability_years: 25 },
  recycled_steel:           { co2e_per_kg: 0.9,  cost_per_kg: 1.00, recyclability_score: 0.92, durability_years: 25 },
  ABS:                      { co2e_per_kg: 3.8,  cost_per_kg: 2.40, recyclability_score: 0.30, durability_years: 12 },
  polypropylene:            { co2e_per_kg: 2.0,  cost_per_kg: 1.60, recyclability_score: 0.45, durability_years: 10 },
  PET:                      { co2e_per_kg: 2.7,  cost_per_kg: 1.80, recyclability_score: 0.60, durability_years: 12 },
  recycled_PET:             { co2e_per_kg: 1.1,  cost_per_kg: 1.70, recyclability_score: 0.75, durability_years: 11 },
  bamboo_composite:         { co2e_per_kg: 1.2,  cost_per_kg: 2.10, recyclability_score: 0.55, durability_years: 15 },
  FSC_plywood:              { co2e_per_kg: 0.7,  cost_per_kg: 1.40, recyclability_score: 0.50, durability_years: 18 },
  oak:                      { co2e_per_kg: 0.5,  cost_per_kg: 3.60, recyclability_score: 0.60, durability_years: 30 },
  cork:                     { co2e_per_kg: 0.4,  cost_per_kg: 2.80, recyclability_score: 0.70, durability_years: 12 },
  hemp_composite:           { co2e_per_kg: 1.0,  cost_per_kg: 2.20, recyclability_score: 0.65, durability_years: 14 },
  PLA:                      { co2e_per_kg: 1.8,  cost_per_kg: 2.60, recyclability_score: 0.40, durability_years: 7 },
  glass_fiber_composite:    { co2e_per_kg: 5.5,  cost_per_kg: 3.10, recyclability_score: 0.20, durability_years: 22 },
  flax_fiber_composite:     { co2e_per_kg: 1.6,  cost_per_kg: 2.90, recyclability_score: 0.55, durability_years: 16 },
  mycelium_foam:            { co2e_per_kg: 0.3,  cost_per_kg: 2.00, recyclability_score: 0.85, durability_years: 8 },
  wool_felt:                { co2e_per_kg: 1.4,  cost_per_kg: 3.40, recyclability_score: 0.80, durability_years: 15 },
  polyurethane_foam:        { co2e_per_kg: 4.2,  cost_per_kg: 2.10, recyclability_score: 0.15, durability_years: 8 },
  nylon:                    { co2e_per_kg: 6.5,  cost_per_kg: 3.00, recyclability_score: 0.35, durability_years: 14 },
}

// Human-readable labels for materials (for display).
export const MATERIAL_LABELS = {
  aluminum_6061: 'Aluminum 6061',
  recycled_aluminum: 'Recycled aluminum',
  steel: 'Steel',
  recycled_steel: 'Recycled steel',
  ABS: 'ABS plastic',
  polypropylene: 'Polypropylene',
  PET: 'PET',
  recycled_PET: 'Recycled PET (rPET)',
  bamboo_composite: 'Bamboo composite',
  FSC_plywood: 'FSC plywood',
  oak: 'Oak',
  cork: 'Cork',
  hemp_composite: 'Hemp composite',
  PLA: 'PLA',
  glass_fiber_composite: 'Glass-fiber composite',
  flax_fiber_composite: 'Flax-fiber composite',
  mycelium_foam: 'Mycelium foam',
  wool_felt: 'Wool felt',
  polyurethane_foam: 'Polyurethane foam',
  nylon: 'Nylon',
}

export function materialLabel(id) {
  return MATERIAL_LABELS[id] || id
}

// Helper to build a suggestion from a material id relative to an original.
function suggest(materialId, originalId, { score, durability_years, explanation }) {
  const m = MATERIALS[materialId]
  const o = MATERIALS[originalId]
  const cost_delta_pct = Math.round(((m.cost_per_kg - o.cost_per_kg) / o.cost_per_kg) * 100)
  const co2e_reduction_pct = Math.round(((o.co2e_per_kg - m.co2e_per_kg) / o.co2e_per_kg) * 100)
  return {
    material: materialId,
    score,
    co2e_per_kg: m.co2e_per_kg,
    co2e_reduction_pct,
    cost_delta_pct,
    durability_years: durability_years ?? m.durability_years,
    recyclability_score: m.recyclability_score,
    cost_per_kg: m.cost_per_kg, // optional helper field
    explanation,
  }
}

function original(id) {
  const m = MATERIALS[id]
  return {
    co2e_per_kg: m.co2e_per_kg,
    cost_per_kg: m.cost_per_kg,
    recyclability_score: m.recyclability_score,
    durability_years: m.durability_years,
  }
}

// The demo chair — 11 components, ~2.9 kg mass each estimated for volume math.
export const COMPONENTS = [
  {
    component_id: 'leg_base_star_01',
    name: '5-star base',
    mass_kg: 2.4,
    original_material: 'aluminum_6061',
    original: original('aluminum_6061'),
    suggestions: [
      suggest('recycled_aluminum', 'aluminum_6061', {
        score: 0.91,
        explanation:
          'Recycled aluminum matches 6061’s strength and 20-year lifespan while cutting embodied carbon by ~74%, at a slightly lower cost — the clearest win in the whole chair.',
      }),
      suggest('glass_fiber_composite', 'aluminum_6061', {
        score: 0.58,
        explanation:
          'Glass-fiber composite is light and strong enough for the base, but it is hard to recycle and carries higher embodied carbon than recycled aluminum, so it is a distant second.',
      }),
    ],
    rejected: [
      { material: 'FSC_plywood', reason: 'flexural strength insufficient for a rolling 5-star base under 120 kg dynamic load' },
      { material: 'mycelium_foam', reason: 'compressive strength 0.3 MPa << required ~35 MPa for load-bearing base' },
    ],
  },
  {
    component_id: 'gas_lift_cylinder_01',
    name: 'Gas-lift cylinder',
    mass_kg: 1.1,
    original_material: 'steel',
    original: original('steel'),
    suggestions: [
      suggest('recycled_steel', 'steel', {
        score: 0.88,
        explanation:
          'Recycled steel is a drop-in for the pressurised cylinder wall: identical strength and temperature tolerance, ~61% less carbon, marginally cheaper.',
      }),
    ],
    rejected: [
      { material: 'aluminum_6061', reason: 'yield strength too low for the sealed pressure vessel at full extension' },
      { material: 'ABS', reason: 'max service temp 80°C and creep under sustained pressure make it unsafe for a gas cylinder' },
      { material: 'hemp_composite', reason: 'not rated for pressurised or safety-critical structural use' },
    ],
  },
  {
    component_id: 'seat_pan_01',
    name: 'Seat pan (structural)',
    mass_kg: 1.6,
    original_material: 'steel',
    original: original('steel'),
    suggestions: [
      suggest('recycled_steel', 'steel', {
        score: 0.86,
        explanation:
          'Recycled steel keeps the seat pan’s load rating and stiffness identical while removing ~61% of its carbon at a lower price.',
      }),
      suggest('FSC_plywood', 'steel', {
        score: 0.71,
        explanation:
          'FSC plywood is a proven seat-pan material with very low embodied carbon and lower cost, but it is heavier for the same stiffness and less recyclable than steel.',
      }),
    ],
    rejected: [
      { material: 'cork', reason: 'flexural strength insufficient to span the seat under a seated adult' },
    ],
  },
  {
    component_id: 'seat_cushion_01',
    name: 'Seat cushion / foam',
    mass_kg: 0.8,
    original_material: 'polyurethane_foam',
    original: original('polyurethane_foam'),
    suggestions: [
      suggest('mycelium_foam', 'polyurethane_foam', {
        score: 0.79,
        explanation:
          'Mycelium foam is home-compostable and cuts cushion carbon by ~93%, though its ~8-year comfort life is a touch shorter than PU foam — acceptable for the gain.',
      }),
      suggest('wool_felt', 'polyurethane_foam', {
        score: 0.74,
        explanation:
          'Layered wool felt is durable, breathable and highly recyclable with far lower carbon than PU foam, but costs more per kg and firmer feel.',
      }),
    ],
    rejected: [],
  },
  {
    component_id: 'backrest_shell_01',
    name: 'Backrest shell',
    mass_kg: 1.2,
    original_material: 'ABS',
    original: original('ABS'),
    suggestions: [
      suggest('recycled_PET', 'ABS', {
        score: 0.81,
        explanation:
          'Recycled PET moulds to the same backrest geometry, cuts carbon ~71% and is far more recyclable than ABS, at a lower cost — strong all-round swap.',
      }),
      suggest('hemp_composite', 'ABS', {
        score: 0.72,
        explanation:
          'Hemp composite gives a natural finish and low carbon with adequate stiffness for a backrest, but is pricier and slightly less durable than rPET.',
      }),
    ],
    rejected: [
      { material: 'oak', reason: 'cannot form the curved ergonomic shell without laminating; out of scope for this part' },
    ],
  },
  {
    component_id: 'backrest_frame_01',
    name: 'Backrest frame',
    mass_kg: 0.9,
    original_material: 'steel',
    original: original('steel'),
    suggestions: [
      suggest('recycled_steel', 'steel', {
        score: 0.87,
        explanation:
          'Recycled steel matches the frame’s strength and fatigue life exactly while cutting carbon ~61% at lower cost.',
      }),
    ],
    rejected: [
      { material: 'PLA', reason: 'tensile strength ~50 MPa but poor fatigue and low heat resistance make it unfit for a recline-loaded frame' },
    ],
  },
  {
    component_id: 'armrests_01',
    name: 'Armrests (pair)',
    mass_kg: 0.7,
    original_material: 'ABS',
    original: original('ABS'),
    suggestions: [
      suggest('hemp_composite', 'ABS', {
        score: 0.78,
        explanation:
          'Hemp composite armrests cut carbon ~74%, feel warm to the touch and are far more recyclable than ABS, for a small cost premium.',
      }),
      suggest('recycled_PET', 'ABS', {
        score: 0.76,
        explanation:
          'Recycled PET is the lower-cost swap with ~71% less carbon and better recyclability than ABS, though a plainer finish than hemp.',
      }),
    ],
    rejected: [],
  },
  {
    component_id: 'casters_01',
    name: 'Casters (5×)',
    mass_kg: 0.5,
    original_material: 'nylon',
    original: original('nylon'),
    suggestions: [
      suggest('recycled_PET', 'nylon', {
        score: 0.7,
        explanation:
          'Recycled PET rollers cut carbon ~83% versus nylon and cost less, with adequate wear life for casters; slightly softer so best paired with a harder tread.',
      }),
    ],
    rejected: [
      { material: 'mycelium_foam', reason: 'abrasion resistance far too low for a floor-contact rolling surface' },
      { material: 'cork', reason: 'wears rapidly under point load and rolling — unsuitable for casters' },
    ],
  },
  {
    component_id: 'tilt_mechanism_01',
    name: 'Tilt mechanism housing',
    mass_kg: 1.0,
    original_material: 'steel',
    original: original('steel'),
    suggestions: [
      suggest('recycled_steel', 'steel', {
        score: 0.85,
        explanation:
          'Recycled steel is a straight substitution for the tilt housing: same strength, same tolerances, ~61% less carbon.',
      }),
    ],
    rejected: [
      { material: 'glass_fiber_composite', reason: 'cannot hold the threaded fastener tolerances and spring preload of the mechanism' },
    ],
  },
  {
    component_id: 'seat_upholstery_01',
    name: 'Seat upholstery',
    mass_kg: 0.4,
    original_material: 'PET',
    original: original('PET'),
    suggestions: [
      suggest('recycled_PET', 'PET', {
        score: 0.83,
        explanation:
          'Recycled PET fabric is visually identical to virgin PET upholstery, cuts carbon ~59% and improves recyclability at a lower cost.',
      }),
      suggest('wool_felt', 'PET', {
        score: 0.75,
        explanation:
          'Wool felt is a natural, highly durable and recyclable upholstery with ~48% less carbon than PET, but costs notably more per kg.',
      }),
    ],
    rejected: [],
  },
  {
    component_id: 'fasteners_01',
    name: 'Fasteners & screws',
    mass_kg: 0.3,
    original_material: 'steel',
    original: original('steel'),
    suggestions: [
      suggest('recycled_steel', 'steel', {
        score: 0.84,
        explanation:
          'Recycled-steel fasteners meet the same thread and torque specs with ~61% less carbon; a small mass, but an easy no-compromise swap.',
      }),
    ],
    rejected: [
      { material: 'PLA', reason: 'thread shear strength far below spec for load-bearing fasteners' },
      { material: 'aluminum_6061', reason: 'galvanic corrosion risk against steel inserts; not recommended for mixed-metal fastening' },
    ],
  },
]

// Volume assumptions for the summary math.
const ANNUAL_VOLUME = 10000

// Build the /analyze-bom response, computing the summary from the components so
// the headline numbers always agree with the per-component detail.
export function buildBomResponse() {
  let total_co2e_saved_kg = 0
  let weighted_cost_delta = 0
  let total_mass = 0
  let viable_swaps = 0
  let flagged = 0

  const components = COMPONENTS.map((c) => {
    const best = c.suggestions[0]
    if (best) {
      viable_swaps += 1
      const saved_per_unit = (c.original.co2e_per_kg - best.co2e_per_kg) * c.mass_kg
      total_co2e_saved_kg += saved_per_unit * ANNUAL_VOLUME
      weighted_cost_delta += best.cost_delta_pct * c.mass_kg
      total_mass += c.mass_kg
    }
    if (c.rejected && c.rejected.length > 0) flagged += c.rejected.length
    return c
  })

  return {
    summary: {
      total_co2e_saved_kg: Math.round(total_co2e_saved_kg),
      total_cost_delta_pct: total_mass ? +(weighted_cost_delta / total_mass).toFixed(1) : 0,
      viable_swaps,
      flagged,
      component_count: components.length,
      annual_volume: ANNUAL_VOLUME,
    },
    components,
  }
}

export const mockBomResponse = buildBomResponse()
