// API layer. Tries the real FastAPI backend first (proxied at /api → :8000);
// falls back to the mock BOM response so the frontend is fully demoable before
// Person A's backend lands. The response shapes are identical by contract.

import { mockBomResponse } from './mockData.js'

const DEFAULT_WEIGHTS = { carbon: 0.4, recyclability: 0.2, durability: 0.2, cost: 0.2 }

// Simulate network latency so the loading state is visible in the demo.
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function analyzeBom({ weights = DEFAULT_WEIGHTS, annualVolume = 10000 } = {}) {
  try {
    const res = await fetch('/api/analyze-bom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Real backend expects { components, weights, annual_volume }. During the
      // mock phase there are no uploaded components to forward yet.
      body: JSON.stringify({ components: [], weights, annual_volume: annualVolume }),
      signal: AbortSignal.timeout(2500),
    })
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.components) && data.components.length > 0) {
        return { data, source: 'live' }
      }
    }
  } catch {
    // fall through to mock
  }
  await delay(650)
  return { data: mockBomResponse, source: 'mock' }
}
