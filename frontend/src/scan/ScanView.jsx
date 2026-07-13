// Consumer "scan a product" page.
//
// Shares the palette with the BOM app but uses a lighter single-column layout so
// it doesn't read as the BOM dashboard.
import React, { useRef, useState } from 'react'
import { T, Icon, ICONS, btnGhost } from './tokens.jsx'
import BarcodeScanner from './BarcodeScanner.jsx'
import ScanResultCard from './ScanResultCard.jsx'
import ContributePrompt from './ContributePrompt.jsx'
import { scanBarcode, scanPhoto } from '../scanApi.js'
import { normalizeImage } from './normalizeImage.js'

export default function ScanView() {
  const [scan, setScan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const photoInputRef = useRef(null)

  const runBarcode = async (gtin) => {
    setBusy(true); setBusyLabel('Scoring…'); setError(''); setScan(null)
    try {
      setScan(await scanBarcode(gtin))
    } catch (e) {
      setError(e.message || 'Scan failed. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  // Scan a photo File/Blob — used by both the file picker and the live-camera
  // "Capture" button (which hands us a still frame on browsers without the
  // native barcode detector).
  const scanFile = async (file) => {
    if (!file) return
    setBusy(true); setBusyLabel('Reading photo…'); setError(''); setScan(null)
    try {
      // Convert HEIC/large phone photos to a right-sized JPEG the vision API can read.
      const prepared = await normalizeImage(file)
      setScan(await scanPhoto(prepared))
    } catch (err) {
      setError(err.message || 'Couldn\'t read that photo.')
    } finally {
      setBusy(false)
    }
  }

  const runPhoto = (e) => {
    const file = e.target.files?.[0]
    if (file) e.target.value = '' // allow re-selecting the same file
    scanFile(file)
  }

  const reset = () => { setScan(null); setError('') }

  return (
    <div className="eco-page" style={{ maxWidth: 620, paddingTop: 48, paddingBottom: 96 }}>
      <div className="mono" style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        Instant product score
      </div>
      <h1 className="eco-h2" style={{ fontWeight: 700, letterSpacing: '-0.03em', margin: '16px 0 10px', lineHeight: 1.1 }}>
        Scan a product
      </h1>
      <p style={{ fontSize: 15.5, color: T.ink3, lineHeight: 1.6, margin: '0 0 28px' }}>
        Scan a barcode or photograph the product. Returns a repairability score and a carbon score.
        Scores are badged Verified or Estimated.
      </p>

      {!scan && (
        <>
          <BarcodeScanner onDetected={runBarcode} onCapture={scanFile} busy={busy} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: T.line }} />
            <span style={{ fontSize: 11.5, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: T.line }} />
          </div>

          <label className="eco-btn eco-lift eco-card" style={{ ...btnGhost, width: '100%', boxSizing: 'border-box', padding: '13px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            <Icon d={ICONS.camera} size={16} stroke={T.ink} sw={1.9} /> Upload a product photo
            <input ref={photoInputRef} type="file" accept="image/*" onChange={runPhoto} disabled={busy} style={{ display: 'none' }} />
          </label>
        </>
      )}

      {busy && (
        <div style={{ textAlign: 'center', padding: '34px 0', color: T.muted, fontSize: 13.5 }}>
          <div className="eco-spin" style={{ width: 30, height: 30, margin: '0 auto', borderRadius: '50%', border: `3px solid ${T.line}`, borderTopColor: T.accent }} />
          <div style={{ marginTop: 12 }}>{busyLabel}</div>
          <div style={{ marginTop: 4, fontSize: 11.5, color: T.faint }}>Verified lookup is instant. An AI estimate takes a few seconds.</div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 18, background: 'rgba(176,87,110,0.08)', border: '1px solid rgba(176,87,110,0.34)', color: '#8A3F52', fontSize: 13, lineHeight: 1.55, borderRadius: 12, padding: '13px 16px' }}>
          {error}
        </div>
      )}

      {scan && (
        <div>
          <ScanResultCard scan={scan} />

          {scan.needs_contribution && (
            <div style={{ marginTop: 22 }}>
              <ContributePrompt gtin={scan.gtin} productName={scan.productName} />
            </div>
          )}

          <button onClick={reset} className="eco-btn" style={{ ...btnGhost, marginTop: 22 }}>
            <Icon d={ICONS.barcode} size={14} stroke={T.ink} sw={1.9} /> Scan another product
          </button>
        </div>
      )}

      <p style={{ fontSize: 11, color: T.faint, lineHeight: 1.6, marginTop: 40 }}>
        Repairability: French durability/repairability index. Environmental grade: Open Food Facts
        Eco-Score where the product has one, otherwise an AI estimate from the product category.
        Every score is badged Verified or Estimated.
      </p>
    </div>
  )
}
