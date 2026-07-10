import React, { useMemo, useState } from 'react'
import {
  DATA, BOM, CATEGORIES, CAT_COLORS,
  mat, co2eColor, recycColor, fmtCost, datasetCsv,
} from './materials.js'
import { parseBomFile, bomTemplateCsv } from './bomParser.js'

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

// ---------------------------------------------------------------------------
// Top navigation
// ---------------------------------------------------------------------------
function TopNav({ view, setView }) {
  const tab = (active) => ({
    background: active ? '#EAF1FD' : 'transparent',
    color: active ? '#2563EB' : '#5B7099',
    border: 'none', fontSize: 13.5, fontWeight: 600, padding: '8px 14px',
    borderRadius: 8, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
  })
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #E2EAF6' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#2563EB,#1E3A8A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} stroke="#fff" d={['M12 2 2 7l10 5 10-5-10-5Z', 'm2 17 10 5 10-5', 'm2 12 10 5 10-5']} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>MaterialSwap</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '76px 28px 60px', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 600, color: '#2563EB', background: '#E7EEFC', padding: '5px 12px', borderRadius: 20, letterSpacing: '0.04em' }}>SUSTAINABLE SWAP RECOMMENDER</div>
      <h1 style={{ fontSize: 33, fontWeight: 700, letterSpacing: '-0.025em', margin: '18px 0 10px', lineHeight: 1.15 }}>Upload a bill of materials.<br />Get lower-carbon swaps back.</h1>
      <p style={{ fontSize: 15, color: '#5B7099', lineHeight: 1.6, margin: '0 auto 34px', maxWidth: 460 }}>Drop in your product BOM and we map each component to a sustainable alternative — with the updated cost, embodied carbon, and recyclability worked out for you.</p>

      <label style={{ display: 'block', background: '#fff', border: '1.5px dashed #B9CCEA', borderRadius: 16, padding: '44px 30px', cursor: busy ? 'default' : 'pointer', transition: 'border-color 0.15s' }}
        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#FBFDFF' }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#B9CCEA'; e.currentTarget.style.background = '#fff' }}>
        <input type="file" accept=".csv,.xlsx,.xls" disabled={busy} style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onFile(f); e.target.value = '' }} />
        <div style={{ width: 54, height: 54, margin: '0 auto 16px', borderRadius: 14, background: '#EAF1FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={26} stroke="#2563EB" sw={1.9} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} />
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 600 }}>{busy ? 'Reading…' : (fileName || 'Drop your BOM file here')}</div>
        <div style={{ fontSize: 13, color: '#8398BD', marginTop: 5 }}>CSV · columns: component, material, kg · click to browse</div>
      </label>

      {error && (
        <div style={{ marginTop: 16, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: 13, lineHeight: 1.55, borderRadius: 10, padding: '12px 15px', textAlign: 'left' }}>{error}</div>
      )}

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onSample() }} style={{ fontSize: 13.5, fontWeight: 500, color: '#5B7099' }}>Try a sample BOM instead</a>
        <span style={{ color: '#CBD5E1' }}>·</span>
        <a href="#" onClick={(e) => { e.preventDefault(); downloadCsv(bomTemplateCsv(), 'bom_template.csv') }} style={{ fontSize: 13.5, fontWeight: 500, color: '#5B7099' }}>Download a BOM template</a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------------
function Tile({ label, value, valueColor, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2EAF6', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5B7099', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", marginTop: 6, color: valueColor }}>{value}</div>
      <div style={{ fontSize: 12.5, color: '#5B7099', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

const th = (extra) => ({ textAlign: 'left', padding: '11px 22px', fontWeight: 600, color: '#8398BD', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #EEF3FA', ...extra })

function ResultsView({ setView, bom: bomInput, meta, warnings }) {
  const rows = useMemo(() => {
    let costFrom = 0, costTo = 0, co2eFrom = 0, co2eTo = 0, recycFrom = 0, recycTo = 0
    const bom = bomInput.map((b) => {
      const f = mat(b.from), t = mat(b.to)
      const tc = t.cost_per_kg * b.kg, fe = f.co2e_per_kg * b.kg, te = t.co2e_per_kg * b.kg
      costFrom += f.cost_per_kg * b.kg; costTo += tc; co2eFrom += fe; co2eTo += te
      recycFrom += f.recyclability_score; recycTo += t.recyclability_score
      return { ...b, cost: fmtCost(tc), co2e: te.toFixed(1) }
    })
    const n = bomInput.length || 1
    return { bom, costFrom, costTo, co2eFrom, co2eTo, recycFrom: recycFrom / n, recycTo: recycTo / n }
  }, [bomInput])

  const costUp = rows.costTo > rows.costFrom
  const costDelta = (costUp ? '+' : '−') + '$' + Math.abs(rows.costTo - rows.costFrom).toFixed(2)
  const totalKg = bomInput.reduce((s, b) => s + b.kg, 0)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '34px 28px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('upload') }} style={{ fontSize: 13, fontWeight: 500, color: '#5B7099', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon size={14} sw={2.2} d={['M19 12H5', 'm12 19-7-7 7-7']} /> New analysis
          </a>
          <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>{meta.productName}</div>
          <div style={{ fontSize: 13, color: '#5B7099', marginTop: 2 }}>{bomInput.length} components · {totalKg.toFixed(1)} kg / unit · {meta.note}</div>
        </div>
        <button onClick={downloadDataset} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', color: '#2563EB', border: '1px solid #CFDCF3', fontSize: 13, fontWeight: 600, padding: '9px 15px', borderRadius: 9, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          <Icon size={14} sw={2.2} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} /> Export dataset
        </button>
      </div>

      {warnings && warnings.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12, padding: '13px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{warnings.length} note{warnings.length > 1 ? 's' : ''} while parsing</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#78591C', lineHeight: 1.6 }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <Tile label="Embodied carbon" valueColor="#15803D" value={'−' + Math.round((1 - rows.co2eTo / rows.co2eFrom) * 100) + '%'} sub={`${rows.co2eFrom.toFixed(1)} → ${rows.co2eTo.toFixed(1)} kg CO₂e / unit`} />
        <Tile label="Unit material cost" valueColor={costUp ? '#B45309' : '#15803D'} value={costDelta} sub={`${fmtCost(rows.costFrom)} → ${fmtCost(rows.costTo)} / unit`} />
        <Tile label="Recyclable content" valueColor="#2563EB" value={'+' + Math.round((rows.recycTo - rows.recycFrom) * 100) + 'pts'} sub={`avg score ${rows.recycFrom.toFixed(2)} → ${rows.recycTo.toFixed(2)}`} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2EAF6', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #EEF3FA', fontSize: 14, fontWeight: 600 }}>Recommended swaps · {rows.bom.length} components</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#F7FAFE' }}>
                <th style={th()}>Component</th>
                <th style={th({ padding: '11px 12px' })}>Swap</th>
                <th style={th({ padding: '11px 12px', textAlign: 'right' })}>Cost / unit</th>
                <th style={th({ textAlign: 'right' })}>CO₂e / unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.bom.map((b) => (
                <tr key={b.component}>
                  <td style={{ padding: '14px 22px', borderBottom: '1px solid #F1F5FB' }}>
                    <div style={{ fontWeight: 600 }}>{b.component}</div>
                    <div style={{ fontSize: 11.5, color: '#8398BD', marginTop: 2 }}>{b.kg} kg</div>
                  </td>
                  <td style={{ padding: '14px 12px', borderBottom: '1px solid #F1F5FB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: '#94A3B8', textDecoration: 'line-through' }}>{b.from}</span>
                      <Icon size={13} stroke="#2563EB" sw={2.4} d={['M5 12h14', 'm12 5 7 7-7 7']} />
                      <span style={{ color: '#0B2447', fontWeight: 600 }}>{b.to}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", borderBottom: '1px solid #F1F5FB', color: '#334E7B' }}>{b.cost}</td>
                  <td style={{ padding: '14px 22px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", borderBottom: '1px solid #F1F5FB' }}>
                    <span style={{ color: '#15803D', fontWeight: 600 }}>{b.co2e}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F7FAFE' }}>
                <td style={{ padding: '14px 22px', fontWeight: 700 }} colSpan={2}>Total per unit</td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{fmtCost(rows.costTo)}</td>
                <td style={{ padding: '14px 22px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: '#15803D' }}>{rows.co2eTo.toFixed(1)} kg</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: '#8398BD', marginTop: 14, lineHeight: 1.6 }}>Sample BOM for demonstration. Cost and CO₂e are computed from the material library; figures marked <em>estimated</em> in the dataset are indicative, not sourced to a single figure.</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Material library view
// ---------------------------------------------------------------------------
function LibraryView({ query, setQuery, category, setCategory, sortKey, sortDir, setSort, setSelected }) {
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

  const sortableTh = (key, label, unit) => (
    <th onClick={() => setSort(key)} style={{ textAlign: unit ? 'right' : 'left', padding: unit ? '12px 12px' : '12px 20px', fontWeight: 600, color: '#334E7B', cursor: 'pointer', borderBottom: '1px solid #EEF3FA', whiteSpace: unit ? 'nowrap' : undefined }}>
      {label}{unit && <span style={{ fontWeight: 400, color: '#8398BD' }}> {unit}</span>}
    </th>
  )

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '34px 28px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Material library</div>
          <div style={{ fontSize: 13, color: '#5B7099', marginTop: 2 }}>{DATA.length} materials · sourced property &amp; carbon data</div>
        </div>
        <button onClick={downloadDataset} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#2563EB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, padding: '9px 15px', borderRadius: 9, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          <Icon size={14} stroke="#fff" sw={2.2} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} /> Download CSV
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#8398BD" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
          <input type="text" placeholder="Search materials…" value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #D6E1F2', borderRadius: 9, fontSize: 13.5, fontFamily: "'IBM Plex Sans', sans-serif", color: '#0B2447', background: '#fff', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} style={{
              ...(category === c ? { background: '#2563EB', color: '#fff', border: '1px solid #2563EB' } : { background: '#fff', color: '#5B7099', border: '1px solid #D6E1F2' }),
              fontSize: 12.5, fontWeight: 600, padding: '8px 13px', borderRadius: 8, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'capitalize',
            }}>{c === 'all' ? 'All' : c}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2EAF6', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#F7FAFE' }}>
                {sortableTh('name', 'Material')}
                {sortableTh('tensile_strength_mpa', 'Tensile', 'MPa')}
                {sortableTh('cost_per_kg', 'Cost', '$/kg')}
                {sortableTh('co2e_per_kg', 'CO₂e', 'kg/kg')}
                <th onClick={() => setSort('recyclability_score')} style={{ textAlign: 'left', padding: '12px 12px', fontWeight: 600, color: '#334E7B', cursor: 'pointer', borderBottom: '1px solid #EEF3FA' }}>Recyclability</th>
                <th style={{ textAlign: 'right', padding: '12px 20px', fontWeight: 600, color: '#334E7B', borderBottom: '1px solid #EEF3FA' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} onClick={() => setSelected(r.name)} style={{ cursor: 'pointer' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#FAFCFF' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ padding: '13px 20px', borderBottom: '1px solid #F1F5FB' }}>
                    <div style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>{r.name}</div>
                    <div style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: CAT_COLORS[r.category] || '#475569' }}>{r.category}</div>
                  </td>
                  <td style={{ padding: '13px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", borderBottom: '1px solid #F1F5FB', color: '#334E7B' }}>{r.tensile_strength_mpa}</td>
                  <td style={{ padding: '13px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", borderBottom: '1px solid #F1F5FB', color: '#334E7B' }}>{fmtCost(r.cost_per_kg)}</td>
                  <td style={{ padding: '13px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, borderBottom: '1px solid #F1F5FB' }}>
                    <span style={{ color: co2eColor(r.co2e_per_kg) }}>{r.co2e_per_kg.toFixed(2)}</span>
                  </td>
                  <td style={{ padding: '13px 12px', borderBottom: '1px solid #F1F5FB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 52, height: 6, background: '#E7EDF6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: Math.round(r.recyclability_score * 100) + '%', height: '100%', background: recycColor(r.recyclability_score), borderRadius: 4 }} />
                      </div>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#334E7B' }}>{r.recyclability_score.toFixed(2)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', borderBottom: '1px solid #F1F5FB' }}>
                    <Icon size={15} stroke="#B6C2D6" sw={2.2} d={['m9 18 6-6-6-6']} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,36,71,0.32)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px,92vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 30px rgba(11,36,71,0.2)', overflowY: 'auto', padding: '26px 26px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.category}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>{m.name}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#F0F5FC', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', color: '#5B7099', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 22 }}>
          {specs.map((s) => (
            <div key={s.label} style={{ background: '#F6F9FD', border: '1px solid #E9F0F9', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#8398BD', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", marginTop: 3, color: '#0B2447' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#334E7B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Source note &amp; rationale</div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: '#3A4E70', background: '#F6F9FD', border: '1px solid #E9F0F9', borderRadius: 10, padding: '14px 15px' }}>{m.source_note}</div>
        </div>
        <a href={m.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 9 }}>
          <Icon size={15} stroke="#fff" d={['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']} /> Open primary source
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
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

  const setSort = (key) => {
    setSortDir((d) => (sortKey === key ? -d : 1))
    setSortKey(key)
  }
  const selected = DATA.find((d) => d.name === selectedName) || null

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
    <div style={{ minHeight: '100vh', background: '#F4F7FC', fontFamily: "'IBM Plex Sans', system-ui, sans-serif", color: '#0B2447' }}>
      <TopNav view={view} setView={setView} />

      {view === 'upload' && <UploadView fileName={fileName} onFile={analyzeFile} onSample={analyzeSample} busy={busy} error={uploadError} />}
      {view === 'results' && <ResultsView setView={setView} bom={bom} meta={meta} warnings={warnings} />}
      {view === 'library' && (
        <LibraryView
          query={query} setQuery={setQuery}
          category={category} setCategory={setCategory}
          sortKey={sortKey} sortDir={sortDir} setSort={setSort}
          setSelected={setSelectedName}
        />
      )}

      <DetailDrawer material={selected} onClose={() => setSelectedName(null)} />
    </div>
  )
}
