import React, { useMemo, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import { analyzeBom } from './api.js'
import { MATERIALS, materialLabel } from './mockData.js'

// ---------------------------------------------------------------------------
// Radar normalization.
// The four scored axes map onto the API weights { carbon, recyclability,
// durability, cost }. Every axis is drawn so that "further out = better", using
// the min/max of the material library as the 0..1 envelope. Carbon and cost are
// inverted (lower is better); recyclability and durability are kept as-is.
// ---------------------------------------------------------------------------
const AXES = ['co2e_per_kg', 'recyclability_score', 'durability_years', 'cost_per_kg']
const LOWER_IS_BETTER = new Set(['co2e_per_kg', 'cost_per_kg'])
const AXIS_LABEL = {
  co2e_per_kg: 'Carbon',
  recyclability_score: 'Recyclability',
  durability_years: 'Durability',
  cost_per_kg: 'Cost',
}

const BOUNDS = (() => {
  const b = {}
  for (const axis of AXES) {
    let min = Infinity
    let max = -Infinity
    for (const m of Object.values(MATERIALS)) {
      min = Math.min(min, m[axis])
      max = Math.max(max, m[axis])
    }
    b[axis] = { min, max }
  }
  return b
})()

function normalize(axis, value) {
  const { min, max } = BOUNDS[axis]
  if (max === min) return 0.5
  const t = (value - min) / (max - min)
  return LOWER_IS_BETTER.has(axis) ? 1 - t : t
}

// Build recharts-friendly rows comparing the original material against a
// suggestion across all four axes (values scaled to 0..100 for readability).
function radarData(original, suggestion) {
  return AXES.map((axis) => ({
    axis: AXIS_LABEL[axis],
    original: Math.round(normalize(axis, original[axis]) * 100),
    suggested: Math.round(normalize(axis, suggestion[axis]) * 100),
  }))
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------
function fmtInt(n) {
  return Math.round(n).toLocaleString('en-US')
}

// CO2e headline: kg up to 10 t, then tonnes.
function fmtCo2e(kg) {
  if (kg >= 10000) return { value: (kg / 1000).toFixed(1), unit: 't CO₂e / yr' }
  return { value: fmtInt(kg), unit: 'kg CO₂e / yr' }
}

function signedPct(n) {
  const r = Math.round(n * 10) / 10
  return `${r > 0 ? '+' : ''}${r}%`
}

function Metric({ label, value, tone }) {
  const cls = tone ? `m-val ${tone}` : 'm-val'
  return (
    <span className="metric">
      <span className="m-label">{label} </span>
      <span className={cls}>{value}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Radar panel (right column of a component card)
// ---------------------------------------------------------------------------
function ComparisonRadar({ original, suggestion }) {
  const data = useMemo(() => radarData(original, suggestion), [original, suggestion])
  return (
    <div className="radar-wrap">
      <div className="radar-title">Original vs suggested</div>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--grid)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <Radar
              name="Original"
              dataKey="original"
              stroke="var(--series-original)"
              fill="var(--series-original)"
              fillOpacity={0.18}
              strokeWidth={2}
            />
            <Radar
              name="Suggested"
              dataKey="suggested"
              stroke="var(--series-suggested)"
              fill="var(--series-suggested)"
              fillOpacity={0.28}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="radar-legend">
        <span>
          <span className="swatch" style={{ background: 'var(--series-original)' }} />
          Original
        </span>
        <span>
          <span className="swatch" style={{ background: 'var(--series-suggested)' }} />
          Suggested
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// One suggestion row
// ---------------------------------------------------------------------------
function Suggestion({ suggestion, isBest }) {
  const costUp = suggestion.cost_delta_pct > 0
  return (
    <div className={`suggestion${isBest ? ' best' : ''}`}>
      <div className="suggestion-head">
        <span className="suggestion-name">
          {materialLabel(suggestion.material)}
          {isBest && <span className="best-tag">Best swap</span>}
        </span>
        <span className="score">{Math.round(suggestion.score * 100)}/100</span>
      </div>
      <div className="metrics">
        <Metric label="CO₂e" value={`−${suggestion.co2e_reduction_pct}%`} tone="up" />
        <Metric
          label="Cost"
          value={signedPct(suggestion.cost_delta_pct)}
          tone={costUp ? 'down' : 'up'}
        />
        <Metric label="Recyclability" value={`${Math.round(suggestion.recyclability_score * 100)}%`} />
        <Metric label="Durability" value={`${suggestion.durability_years} yr`} />
      </div>
      <p className="explanation">{suggestion.explanation}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// One component card (collapsible)
// ---------------------------------------------------------------------------
function ComponentCard({ component, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const best = component.suggestions[0]
  const rejected = component.rejected || []

  return (
    <div className="card component">
      <div
        className="component-head"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((o) => !o)
          }
        }}
      >
        <div className="component-title">
          <span className="name">{component.name}</span>
          <span className="cur">
            currently <b>{materialLabel(component.original_material)}</b> · {component.mass_kg} kg
          </span>
        </div>
        <div className="head-badges">
          {best ? (
            <span className="pill good">−{best.co2e_reduction_pct}% CO₂e</span>
          ) : (
            <span className="pill flag">No viable swap</span>
          )}
          {rejected.length > 0 && (
            <span className="pill flag">{rejected.length} flagged</span>
          )}
          <span className="chev">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="component-body">
          <div>
            {component.suggestions.map((s, i) => (
              <Suggestion key={s.material} suggestion={s} isBest={i === 0} />
            ))}
            {component.suggestions.length === 0 && (
              <p className="explanation">
                No lower-impact material met this component's engineering requirements.
              </p>
            )}
            {rejected.length > 0 && (
              <div className="rejected">
                <h4>Considered &amp; rejected</h4>
                <ul>
                  {rejected.map((r) => (
                    <li key={r.material}>
                      <b>{materialLabel(r.material)}</b> — {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {best && <ComparisonRadar original={component.original} suggestion={best} />}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary dashboard (KPI row)
// ---------------------------------------------------------------------------
function Summary({ summary }) {
  const co2e = fmtCo2e(summary.total_co2e_saved_kg)
  const costUp = summary.total_cost_delta_pct > 0
  return (
    <>
      <div className="kpi-row">
        <div className="card kpi">
          <div className="label">CO₂e avoided</div>
          <div className="value good">
            {co2e.value} <small>{co2e.unit}</small>
          </div>
          <div className="sub">across the full production run</div>
        </div>
        <div className="card kpi">
          <div className="label">Cost impact</div>
          <div className={`value ${costUp ? 'warn' : 'good'}`}>
            {signedPct(summary.total_cost_delta_pct)}
          </div>
          <div className="sub">mass-weighted, best swaps only</div>
        </div>
        <div className="card kpi">
          <div className="label">Viable swaps</div>
          <div className="value">
            {summary.viable_swaps}
            <small> / {summary.component_count}</small>
          </div>
          <div className="sub">components with a greener option</div>
        </div>
        <div className="card kpi">
          <div className="label">Flagged</div>
          <div className="value warn">{summary.flagged}</div>
          <div className="sub">materials rejected on requirements</div>
        </div>
      </div>
      <p className="summary-caption">
        Estimated over an annual volume of {fmtInt(summary.annual_volume)} units. Carbon savings
        assume every recommended “best swap” is adopted; cost impact is weighted by component mass.
      </p>
    </>
  )
}

// ---------------------------------------------------------------------------
// Upload / entry panel
// ---------------------------------------------------------------------------
function UploadPanel({ onAnalyze, loading }) {
  return (
    <div className="card upload">
      <h2>Upload a bill of materials</h2>
      <p>
        Drop in a product’s BOM and ReMaterial finds lower-carbon material swaps for each component —
        checking engineering requirements so it never suggests something that won’t hold up.
      </p>
      <div className="dropzone">
        Drag &amp; drop a CSV or JSON BOM here — or try the sample below
      </div>
      <div className="upload-actions">
        <button className="btn primary" onClick={onAnalyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze demo office chair'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function App() {
  const [state, setState] = useState({ status: 'idle' }) // idle | loading | done
  const [source, setSource] = useState(null)

  async function runAnalysis() {
    setState({ status: 'loading' })
    const { data, source } = await analyzeBom()
    setSource(source)
    setState({ status: 'done', data })
  }

  const result = state.status === 'done' ? state.data : null

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>
            Re<span className="leaf">Material</span>
          </h1>
          <p>Sustainable material swaps for your bill of materials — carbon down, requirements met.</p>
        </div>
        {source && (
          <span className={`source-badge ${source}`}>
            {source === 'live' ? '● Live API' : '● Demo data'}
          </span>
        )}
      </header>

      {!result && (
        <UploadPanel onAnalyze={runAnalysis} loading={state.status === 'loading'} />
      )}

      {result && (
        <>
          <Summary summary={result.summary} />
          <h3 className="section-title">Components ({result.components.length})</h3>
          {result.components.map((c, i) => (
            <ComponentCard key={c.component_id} component={c} defaultOpen={i === 0} />
          ))}
          <div className="upload-actions" style={{ justifyContent: 'flex-start', marginTop: 24 }}>
            <button className="btn" onClick={() => setState({ status: 'idle' })}>
              ← Analyze another BOM
            </button>
          </div>
        </>
      )}

      <footer className="foot">
        ReMaterial · CSESoc Hackathon 2026 · material metrics are indicative and for demonstration only
      </footer>
    </div>
  )
}
