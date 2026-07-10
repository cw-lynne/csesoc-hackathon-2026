import React, { useMemo, useState } from 'react'
import {
  DATA, BOM, CATEGORIES, CAT_COLORS,
  mat, co2eColor, recycColor, fmtCost, datasetCsv,
} from './materials.js'
import { parseBomFile, bomTemplateCsv } from './bomParser.js'

// --- ecocompass palette (mirrors the CSS vars in theme.css) ----------------
const T = {
  page: '#F4F1EA', card: '#FBFAF6', cardAlt: '#F2EEE3',
  ink: '#23211C', ink2: '#4A463C', ink3: '#6E6A5F', muted: '#8A857A', faint: '#A39C8C',
  line: '#E3DCCD', line2: '#EDE7DA',
  accent: '#1E3D2B', accentSoft: 'rgba(30,61,43,0.10)',
  good: '#5B7A4E', warn: '#A87A3C', bad: '#B0576E',
}

// Trigger a client-side download of CSV text without shipping a static file.
function downloadCsv(text, name) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const downloadDataset = () => downloadCsv(datasetCsv(), 'materials_dataset.csv')

// Meta describing the built-in sample BOM (the ergonomic task chair).
const SAMPLE_META = {
  productName: 'Ergo Task Chair · TC-200',
  componentCount: BOM.length,
  totalKg: BOM.reduce((s, b) => s + b.kg, 0),
  note: 'sample bill of materials',
}

// --- tiny inline icons -----------------------------------------------------
const Icon = ({ d, size = 24, stroke = 'currentColor', sw = 2, fill = 'none', ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {d.map((path, i) => <path key={i} d={path} />)}
  </svg>
)

const ARROW = ['M5 12h14', 'm12 5 7 7-7 7']

// Shared button styles.
const btnSolid = { display: 'inline-flex', alignItems: 'center', gap: 7, background: T.ink, color: T.page, border: 'none', fontSize: 13, fontWeight: 500, padding: '10px 16px', borderRadius: 9, cursor: 'pointer' }
const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 7, background: T.card, color: T.ink, border: `1px solid ${T.line}`, fontSize: 13, fontWeight: 500, padding: '10px 15px', borderRadius: 9, cursor: 'pointer' }
const eyebrow = { fontSize: 11, fontWeight: 400, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }

// How many library entries are credited to the Materiom Commons.
const MATERIOM_COUNT = DATA.filter((d) => d.source === 'materiom').length

// Credits a bio-based recipe family to the Materiom Commons.
function MateriomBadge({ big }) {
  return (
    <span title="Bio-based recipe family catalogued in the Materiom Commons" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(91,122,78,0.12)', border: '1px solid rgba(91,122,78,0.34)', color: T.good, fontSize: big ? 10.5 : 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: big ? '3px 9px' : '2px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: T.good }} /> Materiom
    </span>
  )
}

// Derive the pros/cons for a single from→to swap. Ported from the ecocompass
// prototype: each material property that moves meaningfully becomes a pro or con.
function prosConsFor(f, t) {
  const pros = [], cons = []
  if (!f || !t) return { pros, cons }

  const co2eCut = Math.round((1 - t.co2e_per_kg / f.co2e_per_kg) * 100)
  if (co2eCut >= 5) pros.push(co2eCut + '% lower embodied carbon per kg')
  else if (co2eCut <= -5) cons.push(Math.abs(co2eCut) + '% higher embodied carbon per kg')

  const costDeltaPct = Math.round((t.cost_per_kg / f.cost_per_kg - 1) * 100)
  if (costDeltaPct <= -5) pros.push('Lower material cost (' + costDeltaPct + '%/kg)')
  else if (costDeltaPct >= 5) cons.push('Higher material cost (+' + costDeltaPct + '%/kg)')

  const recycDelta = t.recyclability_score - f.recyclability_score
  if (recycDelta >= 0.08) pros.push('More recyclable at end of life')
  else if (recycDelta <= -0.08) cons.push('Less recyclable at end of life')

  if (t.durability_years >= f.durability_years + 3) pros.push('Longer expected service life')
  else if (t.durability_years <= f.durability_years - 3) cons.push('Shorter expected service life')

  const tensileDeltaPct = (t.tensile_strength_mpa - f.tensile_strength_mpa) / f.tensile_strength_mpa
  if (tensileDeltaPct <= -0.2) cons.push('Lower tensile strength than original')
  else if (tensileDeltaPct >= 0.2) pros.push('Higher tensile strength than original')

  if (t.max_temp_c <= f.max_temp_c - 30) cons.push('Lower maximum service temperature')
  if (f.food_safe && !t.food_safe) cons.push('No longer food-contact safe')
  if (f.outdoor_safe && !t.outdoor_safe) cons.push('No longer rated for outdoor use')

  return { pros: pros.slice(0, 3), cons: cons.slice(0, 2) }
}

// ---------------------------------------------------------------------------
// Top navigation
// ---------------------------------------------------------------------------
function TopNav({ view, setView }) {
  const tab = (active) => ({
    background: 'transparent', border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
    borderBottom: `2px solid ${active ? T.accent : 'transparent'}`,
    color: active ? T.ink : T.muted, fontSize: 14, fontWeight: 500, padding: '6px 1px',
    cursor: 'pointer',
  })
  return (
    <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(244,241,234,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <img src="/logo-icon.svg" alt="ecocompass logo" width={30} height={30} style={{ display: 'block' }} />
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: '#1A2117' }}>ecocompass</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <button onClick={() => setView(view === 'library' ? 'upload' : view)} style={tab(view !== 'library')}>Analyze BOM</button>
          <button onClick={() => setView('library')} style={tab(view === 'library')}>Material library</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload view
// ---------------------------------------------------------------------------
function UploadView({ fileName, onFile, onSample, busy, error }) {
  return (
    <div style={{ maxWidth: 660, margin: '0 auto', padding: '104px 32px 88px' }}>
      <div className="mono" style={eyebrow}>Sustainable swap engine</div>
      <h1 style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.035em', margin: '18px 0 18px', lineHeight: 1.08 }}>Know your material impact, precisely.</h1>
      <p style={{ fontSize: 17, color: T.ink3, lineHeight: 1.6, margin: '0 0 40px', maxWidth: 520 }}>Drop in your bill of materials and ecocompass maps every component to a lower-carbon alternative, with updated cost, embodied carbon and recyclability worked out for you.</p>

      <label style={{ display: 'block', background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: '44px 30px', cursor: busy ? 'default' : 'pointer', textAlign: 'center', transition: 'border-color .18s, background .18s' }}
        onMouseOver={(e) => { if (busy) return; e.currentTarget.style.borderColor = '#C9C1AE'; e.currentTarget.style.background = '#FEFDFB' }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.card }}>
        <input type="file" accept=".csv,.xlsx,.xls" disabled={busy} style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onFile(f); e.target.value = '' }} />
        <div style={{ width: 46, height: 46, margin: '0 auto 16px', borderRadius: 11, border: `1px solid ${T.line}`, background: T.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} stroke={T.ink2} sw={1.6} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{busy ? 'Reading…' : (fileName || 'Drop your BOM file here')}</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>CSV · component, material, kg · click to browse</div>
      </label>

      {error && (
        <div style={{ marginTop: 20, background: 'rgba(176,87,110,0.08)', border: '1px solid rgba(176,87,110,0.34)', color: '#8A3F52', fontSize: 13, lineHeight: 1.55, borderRadius: 12, padding: '12px 15px' }}>{error}</div>
      )}

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <button onClick={onSample} style={btnSolid}>Analyze sample BOM</button>
        <a href="#" onClick={(e) => { e.preventDefault(); downloadCsv(bomTemplateCsv(), 'bom_template.csv') }} style={{ fontSize: 13.5, fontWeight: 500, color: T.ink3, borderBottom: '1px solid #C9C1AE' }}>Download a BOM template</a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------------
function EcoHero({ ecoScore, ecoGrade, scoreColor, headline, co2ePct, costDelta, costUp, recycPts }) {
  const ringR = 56
  const ringCirc = 2 * Math.PI * ringR
  const ringDash = (ringCirc * ecoScore / 100).toFixed(1) + ' ' + ringCirc.toFixed(1)
  const monoLabel = { fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: '32px 34px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 36, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
        <svg width={132} height={132} viewBox="0 0 132 132" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="66" cy="66" r={ringR} fill="none" stroke="#E7E1D3" strokeWidth={10} />
          <circle cx="66" cy="66" r={ringR} fill="none" stroke={scoreColor} strokeWidth={10} strokeLinecap="round" strokeDasharray={ringDash} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', color: scoreColor, lineHeight: 1 }}>{ecoScore}</div>
          <div className="mono" style={{ fontSize: 10.5, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 5 }}>Grade {ecoGrade}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div className="mono" style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Eco score · this build</div>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8, lineHeight: 1.4 }}>{headline}</div>
        <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
          <div>
            <div className="mono" style={monoLabel}>Carbon</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 3, color: T.accent }}>−{co2ePct}%</div>
          </div>
          <div>
            <div className="mono" style={monoLabel}>Cost</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 3, color: costUp ? T.warn : T.good }}>{costDelta}</div>
          </div>
          <div>
            <div className="mono" style={monoLabel}>Recyclability</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 3 }}>+{recycPts} pts</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SwapCard({ s }) {
  const monoMini = { fontSize: 9.5, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.component}</div>
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {s.swapped ? (
              <>
                <span style={{ color: T.faint, textDecoration: 'line-through' }}>{s.from}</span>
                <Icon size={13} stroke={T.muted} sw={2} d={ARROW} />
                <span style={{ color: T.ink, fontWeight: 500 }}>{s.to}</span>
              </>
            ) : (
              <span style={{ color: T.ink2, fontWeight: 500 }}>{s.from} · already lowest-carbon</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, textAlign: 'right' }}>
          <div>
            <div className="mono" style={monoMini}>Cost/unit</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{s.cost}</div>
          </div>
          <div>
            <div className="mono" style={monoMini}>CO₂e/unit</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 500, marginTop: 2, color: T.accent }}>{s.co2e}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.line2}` }}>
        <div>
          <div className="mono" style={{ fontSize: 10, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pros</div>
          {s.pros.length ? s.pros.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, color: T.ink2, lineHeight: 1.5, marginBottom: 9 }}>
              <Icon size={13} stroke={T.accent} sw={2.4} d={['M20 6 9 17l-5-5']} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1 }}>{p}</span>
            </div>
          )) : <div style={{ fontSize: 12.5, color: T.muted }}>No notable gains flagged.</div>}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: T.bad, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Cons</div>
          {s.cons.length ? s.cons.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, color: T.ink2, lineHeight: 1.5, marginBottom: 9 }}>
              <Icon size={13} stroke={T.bad} sw={2.4} d={['M18 6 6 18M6 6l12 12']} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1 }}>{c}</span>
            </div>
          )) : <div style={{ fontSize: 12.5, color: T.muted }}>No material trade-offs identified.</div>}
        </div>
      </div>
    </div>
  )
}

function ResultsView({ setView, bom: bomInput, meta, warnings }) {
  const derived = useMemo(() => {
    let costFrom = 0, costTo = 0, co2eFrom = 0, co2eTo = 0, recycFromSum = 0, recycToSum = 0
    const swaps = bomInput.map((b) => {
      const f = mat(b.from), t = mat(b.to)
      const tc = t.cost_per_kg * b.kg, fe = f.co2e_per_kg * b.kg, te = t.co2e_per_kg * b.kg
      costFrom += f.cost_per_kg * b.kg; costTo += tc; co2eFrom += fe; co2eTo += te
      recycFromSum += f.recyclability_score; recycToSum += t.recyclability_score
      const { pros, cons } = prosConsFor(f, t)
      return { component: b.component, from: b.from, to: b.to, kg: b.kg, swapped: b.from !== b.to, cost: fmtCost(tc), co2e: te.toFixed(1), pros, cons }
    })
    const n = bomInput.length || 1
    return { swaps, costFrom, costTo, co2eFrom, co2eTo, recycFrom: recycFromSum / n, recycTo: recycToSum / n }
  }, [bomInput])

  const costUp = derived.costTo > derived.costFrom
  const costDelta = (costUp ? '+' : '−') + '$' + Math.abs(derived.costTo - derived.costFrom).toFixed(2)
  const co2ePct = Math.round((1 - derived.co2eTo / (derived.co2eFrom || 1)) * 100)
  const recycPts = Math.round((derived.recycTo - derived.recycFrom) * 100)
  let ecoScore = Math.round(55 + co2ePct * 0.32 + recycPts * 0.22 + (costUp ? -6 : 6))
  ecoScore = Math.max(0, Math.min(99, ecoScore))
  const ecoGrade = ecoScore >= 90 ? 'A' : ecoScore >= 75 ? 'B' : ecoScore >= 60 ? 'C' : ecoScore >= 45 ? 'D' : 'F'
  const scoreColor = ecoScore >= 75 ? T.good : ecoScore >= 50 ? T.warn : T.bad
  const headline = ecoGrade <= 'B'
    ? 'This build meaningfully cuts embodied carbon and improves recyclability over the original spec.'
    : 'Solid gains on carbon and recyclability, with a few trade-offs worth reviewing before sign-off.'
  const totalKg = bomInput.reduce((s, b) => s + b.kg, 0)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '44px 32px 96px' }}>
      <div className="no-print" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 30 }}>
        <div>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('upload') }} style={{ fontSize: 13, fontWeight: 500, color: T.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon size={14} sw={2} d={['M19 12H5', 'm12 19-7-7 7-7']} /> New analysis
          </a>
          <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 12 }}>{meta.productName}</div>
          <div style={{ fontSize: 13.5, color: T.muted, marginTop: 4 }}>{bomInput.length} components · {totalKg.toFixed(1)} kg / unit · {meta.note}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={downloadDataset} style={btnGhost}>
            <Icon size={14} sw={2} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} /> Export dataset
          </button>
          <button onClick={() => window.print()} style={btnSolid}>
            <Icon size={14} stroke={T.page} sw={2} d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 15h6M9 11h3']} /> Export PDF report
          </button>
        </div>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="no-print" style={{ background: 'rgba(168,122,60,0.08)', border: '1px solid rgba(168,122,60,0.34)', borderRadius: 12, padding: '13px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{warnings.length} note{warnings.length > 1 ? 's' : ''} while parsing</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: T.ink2, lineHeight: 1.6 }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <EcoHero ecoScore={ecoScore} ecoGrade={ecoGrade} scoreColor={scoreColor} headline={headline}
        co2ePct={co2ePct} costDelta={costDelta} costUp={costUp} recycPts={recycPts} />

      <div style={{ fontSize: 15, fontWeight: 600, margin: '34px 0 14px' }}>Suggested replacements <span style={{ color: T.muted, fontWeight: 400 }}>· {derived.swaps.length} components</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {derived.swaps.map((s) => <SwapCard key={s.component} s={s} />)}
      </div>

      <div className="no-print" style={{ fontSize: 11.5, color: T.faint, marginTop: 20, lineHeight: 1.65 }}>Cost and CO₂e are computed from the material library; figures marked <em>estimated</em> in the dataset are indicative, not sourced to a single figure.</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Material library view
// ---------------------------------------------------------------------------
function LibraryView({ query, setQuery, category, setCategory, sortKey, sortDir, setSort, setSelected, openSuggest }) {
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = DATA.filter((d) => {
      const okCat = category === 'all' || d.category === category
      const okQ = !q || d.name.toLowerCase().includes(q) || d.category.includes(q) || d.source_note.toLowerCase().includes(q)
      return okCat && okQ
    })
    return list.slice().sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') return sortDir * av.localeCompare(bv)
      return sortDir * (av - bv)
    })
  }, [query, category, sortKey, sortDir])

  const thBase = { fontFamily: "'Geist Mono', monospace", fontSize: 10.5, fontWeight: 400, color: T.muted, cursor: 'pointer', borderBottom: `1px solid ${T.line}`, textTransform: 'uppercase', letterSpacing: '0.08em', userSelect: 'none' }
  const sortableTh = (key, label, unit) => (
    <th onClick={() => setSort(key)} style={{ ...thBase, textAlign: unit ? 'right' : 'left', padding: unit ? '13px 12px' : '13px 22px', whiteSpace: unit ? 'nowrap' : undefined, color: sortKey === key ? T.ink : T.muted }}>
      {label}{unit && <span style={{ color: '#B4AD9C' }}> {unit}</span>}{sortKey === key && <span>{sortDir > 0 ? ' ↑' : ' ↓'}</span>}
    </th>
  )

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '44px 32px 88px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em' }}>Material library</div>
          <div style={{ fontSize: 13.5, color: T.muted, marginTop: 4 }}>{DATA.length} materials · <span style={{ color: T.good }}>{MATERIOM_COUNT} bio-based via the Materiom Commons</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={openSuggest} style={btnGhost}>
            <Icon size={14} sw={2} d={['M12 5v14', 'M5 12h14']} /> Suggest a material
          </button>
          <button onClick={downloadDataset} style={btnSolid}>
            <Icon size={14} stroke={T.page} sw={2} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} /> Download CSV
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, color: T.muted, margin: '-14px 0 22px', lineHeight: 1.6 }}>This library is community-sourced. See a gap or a better figure? <a href="#" onClick={(e) => { e.preventDefault(); openSuggest() }} style={{ color: T.accent, fontWeight: 500, borderBottom: '1px solid currentColor' }}>Suggest a material</a> and we'll review it for inclusion.</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#A39C8C" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
          <input type="text" placeholder="Search materials…" value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', padding: '11px 13px 11px 38px', border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 13.5, fontFamily: 'Nunito, sans-serif', color: T.ink, background: T.card, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => {
            const on = category === c
            return (
              <button key={c} onClick={() => setCategory(c)} style={{
                background: on ? T.ink : T.card, color: on ? T.page : T.ink3,
                border: `1px solid ${on ? T.ink : T.line}`,
                fontSize: 12.5, fontWeight: 500, padding: '8px 13px', borderRadius: 8, cursor: 'pointer', textTransform: 'capitalize',
              }}>{c === 'all' ? 'All' : c}</button>
            )
          })}
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 760 }}>
            <thead>
              <tr>
                {sortableTh('name', 'Material')}
                {sortableTh('tensile_strength_mpa', 'Tensile', 'MPa')}
                {sortableTh('cost_per_kg', 'Cost', '$/kg')}
                {sortableTh('co2e_per_kg', 'CO₂e', 'kg/kg')}
                <th onClick={() => setSort('recyclability_score')} style={{ ...thBase, textAlign: 'left', padding: '13px 12px', color: sortKey === 'recyclability_score' ? T.ink : T.muted }}>Recyclability{sortKey === 'recyclability_score' && <span>{sortDir > 0 ? ' ↑' : ' ↓'}</span>}</th>
                <th style={{ textAlign: 'right', padding: '13px 22px', borderBottom: `1px solid ${T.line}` }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cc = CAT_COLORS[r.category] || T.muted
                return (
                  <tr key={r.name} onClick={() => setSelected(r.name)} style={{ cursor: 'pointer' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = T.cardAlt }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '14px 22px', borderBottom: `1px solid ${T.line2}` }}>
                      <div className="mono" style={{ fontWeight: 500, fontSize: 12.5 }}>{r.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em', color: cc }}>{r.category}</span>
                        {r.source === 'materiom' && <MateriomBadge />}
                      </div>
                    </td>
                    <td className="mono" style={{ padding: '14px 12px', textAlign: 'right', borderBottom: `1px solid ${T.line2}`, color: T.ink2 }}>{r.tensile_strength_mpa}</td>
                    <td className="mono" style={{ padding: '14px 12px', textAlign: 'right', borderBottom: `1px solid ${T.line2}`, color: T.ink2 }}>{fmtCost(r.cost_per_kg)}</td>
                    <td className="mono" style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 500, borderBottom: `1px solid ${T.line2}` }}>
                      <span style={{ color: co2eColor(r.co2e_per_kg) }}>{r.co2e_per_kg.toFixed(2)}</span>
                    </td>
                    <td style={{ padding: '14px 12px', borderBottom: `1px solid ${T.line2}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 52, height: 5, background: '#E7E1D3', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: Math.round(r.recyclability_score * 100) + '%', height: '100%', background: recycColor(r.recyclability_score), borderRadius: 4 }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12, color: T.ink2 }}>{r.recyclability_score.toFixed(2)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 22px', textAlign: 'right', borderBottom: `1px solid ${T.line2}` }}>
                      <Icon size={15} stroke="#BEB6A3" sw={2} d={['m9 18 6-6-6-6']} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggest-a-material modal
// ---------------------------------------------------------------------------
const SUGGEST_CATEGORIES = ['metal', 'plastic', 'bioplastic', 'wood', 'natural', 'biocomposite', 'composite']

function SuggestModal({ open, sent, form, setForm, onClose, onSubmit }) {
  if (!open) return null
  const label = { fontSize: 12, fontWeight: 600, color: T.ink2, marginBottom: 6 }
  const field = { width: '100%', padding: '11px 13px', border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 13.5, fontFamily: 'Nunito, sans-serif', color: T.ink, background: T.page, outline: 'none' }
  const closeBtn = <button onClick={onClose} style={{ border: `1px solid ${T.line}`, background: T.page, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', color: T.ink3, fontSize: 17, lineHeight: 1, flexShrink: 0 }}>×</button>
  const canSubmit = form.name.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(35,33,28,0.28)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px,100%)', maxHeight: '88vh', overflowY: 'auto', background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: '0 24px 60px rgba(35,33,28,0.18)', padding: '28px 28px 30px' }}>
        {sent ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Thanks for the suggestion</div>
              {closeBtn}
            </div>
            <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginTop: 10 }}>We'll review <strong>{form.name || 'your material'}</strong> and, if the data checks out, add it to the library with a source citation.</div>
            <button onClick={onClose} style={{ ...btnSolid, marginTop: 22, padding: '12px 22px', fontSize: 14 }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Suggest a material</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 5, lineHeight: 1.5 }}>Know a material with good sourced data on cost, carbon or recyclability? Add it here.</div>
              </div>
              {closeBtn}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
              <div>
                <div style={label}>Material name</div>
                <input type="text" placeholder="e.g. recycled_carbon_fiber" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={field} />
              </div>
              <div>
                <div style={label}>Category</div>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={field}>
                  {SUGGEST_CATEGORIES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <div style={label}>Why should we add it?</div>
                <textarea placeholder="Notable properties, where you'd use it, why it's a good swap…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...field, resize: 'vertical' }} />
              </div>
              <div>
                <div style={label}>Source link <span style={{ fontWeight: 400, color: T.muted }}>(optional but preferred)</span></div>
                <input type="text" placeholder="https://…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={field} />
              </div>
              <div>
                <div style={label}>Your email <span style={{ fontWeight: 400, color: T.muted }}>(optional, in case we have questions)</span></div>
                <input type="text" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={field} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
              <button onClick={onSubmit} disabled={!canSubmit} style={{ border: 'none', fontSize: 14, fontWeight: 500, padding: '12px 22px', borderRadius: 9, fontFamily: 'Nunito, sans-serif', ...(canSubmit ? { background: T.ink, color: T.page, cursor: 'pointer' } : { background: T.line, color: T.faint, cursor: 'not-allowed' }) }}>Submit suggestion</button>
              <button onClick={onClose} style={{ background: 'transparent', color: T.ink3, border: 'none', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------
function DetailDrawer({ material, onClose }) {
  if (!material) return null
  const m = material
  const accent = CAT_COLORS[m.category] || T.accent
  const specs = [
    { label: 'Density', value: m.density.toLocaleString() + ' kg/m³' },
    { label: 'Tensile strength', value: m.tensile_strength_mpa + ' MPa' },
    { label: 'Max service temp', value: m.max_temp_c + ' °C' },
    { label: 'Cost (approx)', value: fmtCost(m.cost_per_kg) + '/kg' },
    { label: 'CO₂e (cradle-gate)', value: m.co2e_per_kg.toFixed(2) + ' kg/kg' },
    { label: 'Recyclability', value: m.recyclability_score.toFixed(2) },
    { label: 'Durability', value: m.durability_years + ' yrs' },
    { label: 'Outdoor / Food', value: (m.outdoor_safe ? 'Yes' : 'No') + ' / ' + (m.food_safe ? 'Yes' : 'No') },
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(35,33,28,0.28)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px,92vw)', height: '100%', background: T.card, borderLeft: `1px solid ${T.line}`, boxShadow: '-14px 0 40px rgba(35,33,28,0.10)', overflowY: 'auto', padding: '28px 28px 44px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="mono" style={{ fontSize: 10.5, fontWeight: 400, color: accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{m.category}</div>
              {m.source === 'materiom' && <MateriomBadge big />}
            </div>
            <div className="mono" style={{ fontSize: 21, fontWeight: 600, marginTop: 6, color: T.ink }}>{m.name}</div>
          </div>
          <button onClick={onClose} style={{ border: `1px solid ${T.line}`, background: T.page, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', color: T.ink3, fontSize: 17, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 11, overflow: 'hidden', marginTop: 24 }}>
          {specs.map((s) => (
            <div key={s.label} style={{ background: T.page, padding: '12px 14px' }}>
              <div className="mono" style={{ fontSize: 10, fontWeight: 400, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 500, marginTop: 4, color: T.ink }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <div className="mono" style={{ fontSize: 10.5, fontWeight: 400, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 9 }}>Source note &amp; rationale</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: T.ink2, background: T.page, border: `1px solid ${T.line}`, borderRadius: 11, padding: '15px 16px' }}>{m.source_note}</div>
        </div>
        <a href={m.source_url} target="_blank" rel="noopener noreferrer" style={{ ...btnSolid, marginTop: 20, textDecoration: 'none' }}>
          <Icon size={15} stroke={T.page} d={['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']} /> {m.source === 'materiom' ? 'Explore in the Materiom Commons' : 'Open primary source'}
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const EMPTY_SUGGEST = { name: '', category: 'metal', notes: '', source: '', email: '' }

export default function App() {
  const [view, setView] = useState('upload') // upload | results | library
  const [fileName, setFileName] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [bom, setBom] = useState(BOM)          // rows currently shown in results
  const [meta, setMeta] = useState(SAMPLE_META)
  const [warnings, setWarnings] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sortKey, setSortKey] = useState('co2e_per_kg')
  const [sortDir, setSortDir] = useState(1)
  const [selectedName, setSelectedName] = useState(null)
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestSent, setSuggestSent] = useState(false)
  const [suggestForm, setSuggestForm] = useState(EMPTY_SUGGEST)

  const setSort = (key) => {
    setSortDir((d) => (sortKey === key ? -d : 1))
    setSortKey(key)
  }
  const selected = DATA.find((d) => d.name === selectedName) || null

  const openSuggest = () => { setSuggestForm(EMPTY_SUGGEST); setSuggestSent(false); setShowSuggest(true) }
  const submitSuggest = () => { if (suggestForm.name.trim()) setSuggestSent(true) }

  const analyzeSample = () => {
    setBom(BOM); setMeta(SAMPLE_META); setWarnings([]); setUploadError(null)
    setFileName(null); setView('results')
  }

  const analyzeFile = async (file) => {
    setFileName(file.name); setUploadError(null); setBusy(true)
    const { rows, warnings: warn, meta: m, error } = await parseBomFile(file)
    setBusy(false)
    if (error) { setUploadError(error); return }
    if (!rows.length) {
      setUploadError((warn && warn[0]) || 'No usable rows found in the file.')
      return
    }
    setBom(rows); setMeta(m); setWarnings(warn || []); setView('results')
  }

  return (
    <div style={{ minHeight: '100vh', background: T.page, color: T.ink }}>
      <TopNav view={view} setView={setView} />

      {view === 'upload' && <UploadView fileName={fileName} onFile={analyzeFile} onSample={analyzeSample} busy={busy} error={uploadError} />}
      {view === 'results' && <ResultsView setView={setView} bom={bom} meta={meta} warnings={warnings} />}
      {view === 'library' && (
        <LibraryView
          query={query} setQuery={setQuery}
          category={category} setCategory={setCategory}
          sortKey={sortKey} sortDir={sortDir} setSort={setSort}
          setSelected={setSelectedName} openSuggest={openSuggest}
        />
      )}

      <SuggestModal open={showSuggest} sent={suggestSent} form={suggestForm} setForm={setSuggestForm}
        onClose={() => setShowSuggest(false)} onSubmit={submitSuggest} />
      <DetailDrawer material={selected} onClose={() => setSelectedName(null)} />
    </div>
  )
}
