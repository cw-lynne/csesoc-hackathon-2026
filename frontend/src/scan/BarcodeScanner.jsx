// Camera barcode scanner for consumer scan mode.
//
// Works on every mobile browser, not just the ones with the native
// BarcodeDetector API:
//   * The live camera (getUserMedia) opens on any browser in a secure context.
//   * Where BarcodeDetector exists (Chrome/Edge/Android) barcodes auto-detect.
//   * Where it doesn't (iOS Safari, Firefox) a "Capture" button grabs the frame
//     and runs it through the AI photo scan — so scanning still works.
//   * Manual barcode entry is always offered as a final fallback.
//
// getUserMedia requires a secure context: https, or http on localhost. Over a
// plain-http LAN address (e.g. a phone hitting http://192.168.x.x) the API is
// absent — we detect that and tell the user to use https.
import React, { useEffect, useRef, useState } from 'react'
import { T, Icon, ICONS, btnAccent, btnGhost } from './tokens.jsx'

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
const DETECT_INTERVAL_MS = 120
const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window
const cameraSupported = typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

const inputStyle = {
  flex: 1, padding: '11px 13px', fontSize: 14, fontFamily: 'ui-monospace, monospace',
  background: T.card, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none',
}

export default function BarcodeScanner({ onDetected, onCapture, busy }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(0)
  const detectorRef = useRef(null)
  const [live, setLive] = useState(false)
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')

  // Tear down camera + detection timer.
  const stop = () => {
    clearTimeout(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setLive(false)
  }

  useEffect(() => stop, []) // cleanup on unmount

  const failCamera = (err) => {
    const name = err && err.name
    setError(
      name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Camera access was blocked. Allow the camera for this site (tap the ᴀA / lock icon in the address bar → Camera → Allow), then try again.'
      : name === 'NotFoundError' || name === 'OverconstrainedError'
        ? 'No usable camera was found on this device — enter the barcode number below instead.'
      : name === 'NotReadableError'
        ? 'The camera is already in use by another app. Close it and try again.'
        : "Couldn't open the camera — enter the barcode number below instead.",
    )
    stop()
  }

  const start = async () => {
    setError('')
    if (!cameraSupported) {
      setError(
        typeof window !== 'undefined' && window.isSecureContext === false
          ? 'The camera needs a secure (https) connection. Open this site over https — then Start camera will work. For now, enter the barcode number below.'
          : "This browser can't open the camera — enter the barcode number below instead.",
      )
      return
    }

    let stream
    try {
      // Rear camera preferred; "ideal" (not "exact") so it still opens on devices
      // with only a front camera.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      })
    } catch (err) {
      if (err && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } catch (err2) { return failCamera(err2) }
      } else {
        return failCamera(err)
      }
    }

    streamRef.current = stream
    setLive(true) // render the <video> before play() — iOS won't play a hidden video
    const v = videoRef.current
    if (v) {
      v.srcObject = stream
      v.setAttribute('playsinline', '') // iOS: keep inline, don't fullscreen
      try { await v.play() } catch { /* autoplay policies — the stream still shows */ }
    }

    // Auto-detect only where the native API exists.
    if (hasDetector) {
      detectorRef.current = detectorRef.current || new window.BarcodeDetector({ formats: FORMATS })
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const codes = await detectorRef.current.detect(videoRef.current)
          const hit = codes.find((c) => c.rawValue && /\d{6,}/.test(c.rawValue))
          if (hit) { stop(); onDetected(hit.rawValue.replace(/\D/g, '')); return }
        } catch { /* transient decode error — keep scanning */ }
        timerRef.current = setTimeout(tick, DETECT_INTERVAL_MS)
      }
      timerRef.current = setTimeout(tick, DETECT_INTERVAL_MS)
    }
  }

  // Grab the current frame. Try a barcode read first (if supported); otherwise
  // hand the still to the parent for an AI photo scan.
  const capture = async () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height)

    if (hasDetector && detectorRef.current) {
      try {
        const codes = await detectorRef.current.detect(canvas)
        const hit = codes.find((c) => c.rawValue && /\d{6,}/.test(c.rawValue))
        if (hit) { stop(); onDetected(hit.rawValue.replace(/\D/g, '')); return }
      } catch { /* fall through to photo scan */ }
    }
    canvas.toBlob((blob) => {
      if (blob && onCapture) { stop(); onCapture(new File([blob], 'scan.jpg', { type: 'image/jpeg' })) }
    }, 'image/jpeg', 0.9)
  }

  const submitManual = (e) => {
    e.preventDefault()
    const gtin = manual.replace(/\D/g, '')
    if (gtin.length >= 6) onDetected(gtin)
    else setError('Enter at least 6 digits from the barcode.')
  }

  return (
    <div>
      <div style={{
        position: 'relative', aspectRatio: '3 / 2', borderRadius: 18, overflow: 'hidden',
        background: '#1A2117', border: `1px solid ${T.line}`,
      }}>
        {/* Always mounted so iOS can play it the instant the stream attaches. */}
        <video ref={videoRef} autoPlay playsInline muted style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          background: '#1A2117',
        }} />

        {live && (
          <div style={{
            position: 'absolute', left: '12%', right: '12%', top: '32%', height: '36%',
            border: '2px solid rgba(255,255,255,0.9)', borderRadius: 14,
            boxShadow: '0 0 0 100vmax rgba(0,0,0,0.34)', pointerEvents: 'none',
          }}>
            <div style={{ position: 'absolute', left: 8, right: 8, height: 2, borderRadius: 2, background: 'rgba(122,182,120,0.95)', boxShadow: '0 0 12px rgba(122,182,120,0.9)' }} className="eco-scan-line" />
          </div>
        )}

        {!live && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', color: 'rgba(255,255,255,0.82)', padding: 24,
          }}>
            <div>
              <Icon d={ICONS.barcode} size={40} stroke="rgba(255,255,255,0.9)" sw={1.6} />
              <div style={{ fontSize: 13.5, marginTop: 12, maxWidth: 260, lineHeight: 1.5 }}>
                Point your camera at a product barcode to get an instant score.
              </div>
            </div>
          </div>
        )}
      </div>

      {live && !hasDetector && (
        <div style={{ fontSize: 12, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>
          Frame the product (or its barcode) and tap Capture — we'll read it for you.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {!live ? (
          <button onClick={start} disabled={busy} className="eco-btn" style={{ ...btnAccent, opacity: busy ? 0.55 : 1 }}>
            <Icon d={ICONS.camera} size={15} stroke={T.page} sw={1.9} /> Start camera
          </button>
        ) : (
          <>
            <button onClick={capture} disabled={busy} className="eco-btn" style={{ ...btnAccent, opacity: busy ? 0.55 : 1 }}>
              <Icon d={ICONS.camera} size={15} stroke={T.page} sw={1.9} /> Capture
            </button>
            <button onClick={stop} className="eco-btn" style={btnGhost}>Stop camera</button>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: '#8A3F52', lineHeight: 1.5 }}>{error}</div>
      )}

      <form onSubmit={submitManual} style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 7 }}>Or enter the barcode number</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = T.accent }}
            onBlur={(e) => { e.target.style.borderColor = T.line }}
            inputMode="numeric"
            placeholder="e.g. 3701234567890"
            style={inputStyle}
          />
          <button type="submit" disabled={busy} className="eco-btn" style={{ ...btnGhost, opacity: busy ? 0.55 : 1 }}>Look up</button>
        </div>
      </form>
    </div>
  )
}
