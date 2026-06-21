import { useState, useRef, useCallback } from 'react'
import { RARITY_LABELS, RARITY_COLORS, getRarityTier } from '../utils/rarityUtils'
import './CardReveal.css'
import './HoloCard.css'

function round(v, p = 3) { return parseFloat(v.toFixed(p)) }
function clamp(v, min = 0, max = 100) { return Math.min(Math.max(v, min), max) }
function adjust(v, fMin, fMax, tMin, tMax) { return round(tMin + (tMax - tMin) * (v - fMin) / (fMax - fMin)) }

export function CardReveal({ card, revealed, index }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const tier = getRarityTier(card.currentSetRarity)
  const color = RARITY_COLORS[tier]
  const label = RARITY_LABELS[tier]
  const delay = index * 300

  const wrapRef = useRef(null)
  const rafRef = useRef(null)

  const handleMove = useCallback((e) => {
    if (!revealed || rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = clamp(round((100 / rect.width)  * (e.clientX - rect.left)))
      const y = clamp(round((100 / rect.height) * (e.clientY - rect.top)))
      const cx = x - 50
      const cy = y - 50
      const fromCenter = round(clamp(Math.sqrt(cx * cx + cy * cy) / 50, 0, 1), 3)

      el.style.setProperty('--pointer-x',          `${x}%`)
      el.style.setProperty('--pointer-y',          `${y}%`)
      el.style.setProperty('--rotate-x',           `${round(-cx / 5)}deg`)
      el.style.setProperty('--rotate-y',           `${round(cy / 5)}deg`)
      el.style.setProperty('--card-opacity',       '1')
      el.style.setProperty('--pointer-from-center', fromCenter)
      el.style.setProperty('--pointer-from-left',   round(x / 100, 3))
      el.style.setProperty('--pointer-from-top',    round(y / 100, 3))
      el.style.setProperty('--background-x',       `${adjust(x, 0, 100, 37, 63)}%`)
      el.style.setProperty('--background-y',       `${adjust(y, 0, 100, 33, 67)}%`)
    })
  }, [revealed])

  const handleLeave = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    const el = wrapRef.current
    if (!el) return
    el.style.setProperty('--rotate-x',           '0deg')
    el.style.setProperty('--rotate-y',           '0deg')
    el.style.setProperty('--card-opacity',        '0')
    el.style.setProperty('--pointer-from-center', '0')
  }, [])

  return (
    <div
      ref={wrapRef}
      className={`card-wrap rarity-${tier} ${revealed ? 'revealed' : ''}`}
      style={{ '--color': color, '--delay': `${delay}ms` }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="card-tilt">
      <div className={`card-inner ${revealed ? 'flipped' : ''}`}>
        <div className="card-face back">
          <div className="back-pattern" />
        </div>

        <div className="card-face front">
          {revealed && (
            <>
              <img
                src={card.card_images[0]?.image_url_small}
                alt={card.name}
                className={`card-img ${imageLoaded ? 'loaded' : ''}`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && <div className="img-skeleton" />}
              <div className="card-footer">
                <span className="card-name">{card.name}</span>
                <span className="rarity-tag" style={{ color }}>{label}</span>
              </div>
              <div className="holo-shine" />
              <div className="holo-glare" />
            </>
          )}
        </div>
      </div>

      </div>{/* card-tilt */}
      {revealed && tier !== 'common' && <div className="glow-ring" />}
    </div>
  )
}
