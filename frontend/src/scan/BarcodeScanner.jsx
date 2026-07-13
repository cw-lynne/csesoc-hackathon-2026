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
// Phone-friendly extras, each capability-gated so they no-op where unsupported:
//   * a torch/flashlight toggle (Android Chrome exposes MediaStreamTrack torch),
//   * a front/back camera flip (only shown when >1 camera exists),
//   * continuous autofocus for sharper barcode reads,
//   * a two-read confirm so a single misdecode can't fire a wrong lookup.
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
  padding: '12px 13px', fontSize: 14, fontFamily: 'ui-monospace, monospace',
  background: T.card, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none',
}

// A control that floats over the camera feed (torch, flip). Round, glassy and
// 40px so it stays a real touch target without crowding the frame.
const overlayBtn = (on) => ({
  width: 40, height: 40, padding: 0, flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '50%', cursor: 'pointer',
  background: on ? 'rgba(255,255,255,0.92)' : 'rgba(20,26,18,0.5)',
  border: `1px solid ${on ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.32)'}`,
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
})

// One corner of the framing reticle. Brackets read as "aim here" far better
// than a closed rectangle, which looks like a disabled input.
function Corner({ v, h }) {
  const W = 3, L = 26
  return (
    <div style={{
      position: 'absolute', width: L, height: L, [v]: -2, [h]: -2,
      borderColor: 'rgba(255,255,255,0.95)', borderStyle: 'solid', borderWidth: 0,
      [`border${v === 'top' ? 'Top' : 'Bottom'}Width`]: W,
      [`border${h === 'left' ? 'Left' : 'Right'}Width`]: W,
      [`border${v === 'top' ? 'Top' : 'Bottom'}${h === 'left' ? 'Left' : 'Right'}Radius`]: 12,
    }} />
  )
}

export default function BarcodeScanner({ onDetected, onCapture, busy }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const trackRef = useRef(null)
  const timerRef = useRef(0)
  const detectorRef = useRef(null)
  const facingRef = useRef('environment') // 'environment' (rear) | 'user' (front)
  const pendingRef = useRef('')           // last raw read, for the two-read confirm
  const [live, setLive] = useState(false)
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')
  const [canTorch, setCanTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [canFlip, setCanFlip] = useState(false)
  // A barcode has been read once and we're waiting on the confirming second
  // read. Surfacing it turns the two-read confirm from a mystery pause into
  // "hold steady".
  const [steady, setSteady] = useState(false)

  // Stop the camera tracks + detection timer, but leave the live flag alone so
  // start() can reacquire (used by the camera flip).
  const stopTracks = () => {
    clearTimeout(timerRef.current)
    pendingRef.current = ''
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    trackRef.current = null
  }

  // Full teardown — back to the idle placeholder.
  const stop = () => {
    stopTracks()
    if (videoRef.current) videoRef.current.srcObject = null
    setLive(false)
    setTorchOn(false)
    setCanTorch(false)
    setSteady(false)
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

  // Enable continuous autofocus (sharper barcodes) and detect torch + a second
  // camera. All best-effort: anything unsupported is silently skipped.
  const applyCameraExtras = async (track) => {
    trackRef.current = track || null
    try {
      const caps = track && track.getCapabilities ? track.getCapabilities() : {}
      setCanTorch(!!caps.torch)
      if (caps.focusMode && caps.focusMode.includes && caps.focusMode.includes('continuous')) {
        try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }) } catch { /* ignore */ }
      }
    } catch { /* getCapabilities unsupported */ }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1)
    } catch { /* enumerateDevices unsupported */ }
  }

  const start = async () => {
    setError('')
    setSteady(false)
    if (!cameraSupported) {
      setError(
        typeof window !== 'undefined' && window.isSecureContext === false
          ? 'The camera needs a secure (https) connection. Open this site over https — then Start camera will work. For now, enter the barcode number below.'
          : "This browser can't open the camera — enter the barcode number below instead.",
      )
      return
    }

    stopTracks() // drop any prior stream (e.g. when flipping cameras)

    let stream
    try {
      // Preferred camera via "ideal" (not "exact") so it still opens on devices
      // that only have the other one.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingRef.current } }, audio: false,
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

    applyCameraExtras(stream.getVideoTracks()[0])

    // Auto-detect only where the native API exists.
    if (hasDetector) {
      detectorRef.current = detectorRef.current || new window.BarcodeDetector({ formats: FORMATS })
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const codes = await detectorRef.current.detect(videoRef.current)
          const hit = codes.find((c) => c.rawValue && /\d{6,}/.test(c.rawValue))
          if (hit) {
            const raw = hit.rawValue.replace(/\D/g, '')
            // Confirm the same barcode twice before firing — kills stray misreads.
            if (raw && raw === pendingRef.current) { stop(); onDetected(raw); return }
            pendingRef.current = raw
            setSteady(true)
          }
        } catch { /* transient decode error — keep scanning */ }
        timerRef.current = setTimeout(tick, DETECT_INTERVAL_MS)
      }
      timerRef.current = setTimeout(tick, DETECT_INTERVAL_MS)
    }
  }

  // Flip between the rear and front camera, reusing the already-granted permission.
  const flip = async () => {
    facingRef.current = facingRef.current === 'environment' ? 'user' : 'environment'
    setTorchOn(false)
    setCanTorch(false)
    await start()
  }

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      setCanTorch(false) // device rejected it — hide the control
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

  // What the viewfinder tells the user right now. Without the native detector
  // there is nothing to auto-detect, so the instruction is to tap Capture.
  const status = !hasDetector
    ? 'Frame the barcode, then tap Capture'
    : steady
      ? 'Hold steady…'
      : 'Searching for a barcode…'

  return (
    <div>
      <div className={`eco-viewfinder${live ? ' eco-viewfinder--live' : ''}`} style={{
        borderRadius: 18, overflow: 'hidden', background: '#1A2117', border: `1px solid ${T.line}`,
      }}>
        {/* Always mounted so iOS can play it the instant the stream attaches. */}
        <video ref={videoRef} autoPlay playsInline muted style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          background: '#1A2117',
        }} />

        {live && (
          <>
            {/* Reticle. The huge spread box-shadow is what dims everything
                outside the frame, so it must not swallow taps on the controls. */}
            <div style={{
              position: 'absolute', left: '9%', right: '9%', top: '31%', height: '30%',
              borderRadius: 12, boxShadow: '0 0 0 100vmax rgba(0,0,0,0.42)', pointerEvents: 'none',
            }}>
              <Corner v="top" h="left" />
              <Corner v="top" h="right" />
              <Corner v="bottom" h="left" />
              <Corner v="bottom" h="right" />
              <div className="eco-scan-line" style={{
                position: 'absolute', left: 10, right: 10, height: 2, borderRadius: 2,
                background: 'rgba(122,182,120,0.95)', boxShadow: '0 0 12px rgba(122,182,120,0.9)',
              }} />
            </div>

            {/* Camera controls, floated over the feed rather than stacked into a
                button row that wraps unpredictably on a narrow screen. */}
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {canTorch && (
                <button onClick={toggleTorch} className="eco-btn" style={overlayBtn(torchOn)}
                  aria-pressed={torchOn} aria-label={torchOn ? 'Turn the light off' : 'Turn the light on'} title={torchOn ? 'Light off' : 'Light on'}>
                  <Icon d={ICONS.zap} size={17} stroke={torchOn ? '#1A2117' : '#fff'} fill={torchOn ? '#1A2117' : 'none'} sw={1.8} />
                </button>
              )}
              {canFlip && (
                <button onClick={flip} disabled={busy} className="eco-btn" style={overlayBtn(false)}
                  aria-label="Switch camera" title="Switch camera">
                  <Icon d={ICONS.flip} size={16} stroke="#fff" sw={1.9} />
                </button>
              )}
            </div>

            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 14,
              display: 'flex', justifyContent: 'center', pointerEvents: 'none', padding: '0 16px',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: '100%',
                fontSize: 12, fontWeight: 600, color: '#fff', textAlign: 'center',
                background: 'rgba(20,26,18,0.6)', border: '1px solid rgba(255,255,255,0.22)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 99, padding: '7px 14px',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: 99, flexShrink: 0,
                  background: steady ? '#7AB678' : 'rgba(255,255,255,0.7)',
                }} />
                {status}
              </span>
            </div>
          </>
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

      {/* One primary action, full width. Stop is secondary and doesn't compete. */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        {!live ? (
          <button onClick={start} disabled={busy} className="eco-btn" style={{ ...btnAccent, flex: 1, opacity: busy ? 0.55 : 1 }}>
            <Icon d={ICONS.camera} size={16} stroke={T.page} sw={1.9} /> Start camera
          </button>
        ) : (
          <>
            <button onClick={capture} disabled={busy} className="eco-btn" style={{ ...btnAccent, flex: 1, opacity: busy ? 0.55 : 1 }}>
              <Icon d={ICONS.camera} size={16} stroke={T.page} sw={1.9} /> Capture
            </button>
            <button onClick={stop} className="eco-btn" style={{ ...btnGhost, flexShrink: 0, paddingInline: 14 }}
              aria-label="Stop the camera" title="Stop camera">
              <Icon d={ICONS.x} size={15} stroke={T.ink3} sw={2.1} />
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: 12, background: 'rgba(176,87,110,0.08)', border: '1px solid rgba(176,87,110,0.34)',
          color: '#8A3F52', fontSize: 12.5, lineHeight: 1.55, borderRadius: 10, padding: '11px 13px',
        }}>{error}</div>
      )}

      <form onSubmit={submitManual} style={{ marginTop: 18 }}>
        <label htmlFor="eco-barcode-manual" style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted, marginBottom: 8,
        }}>
          <Icon d={ICONS.keyboard} size={13} stroke={T.muted} sw={1.8} />
          Or type the number under the barcode
        </label>
        <div className="eco-barcode-entry">
          <input
            id="eco-barcode-manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = T.accent }}
            onBlur={(e) => { e.target.style.borderColor = T.line }}
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 3701234567890"
            style={inputStyle}
          />
          <button type="submit" disabled={busy || !manual.trim()} className="eco-btn"
            style={{ ...btnGhost, flexShrink: 0, opacity: busy || !manual.trim() ? 0.5 : 1 }}>
            Look up
          </button>
        </div>
      </form>
    </div>
  )
}
