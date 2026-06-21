import { useState, useEffect, useRef, useCallback } from 'react'
import { usePackCards } from '../hooks/usePackCards'
import { simulatePack } from '../utils/packSimulator'
import { CardReveal } from './CardReveal'
import { HoloCard } from './HoloCard'
import './PackOpener.css'

const PACK_SIZE = 5
const TEAR_THRESHOLD = 80
const MAX_DRAG = 300

function round(v, p = 3) { return parseFloat(v.toFixed(p)) }
function clamp(v, min = 0, max = 100) { return Math.min(Math.max(v, min), max) }
function adjust(v, fMin, fMax, tMin, tMax) { return round(tMin + (tMax - tMin) * (v - fMin) / (fMax - fMin)) }

export function PackOpener({ set, onBack }) {
  const { cards, loading, error } = usePackCards(set.set_name)
  const [pack, setPack] = useState([])
  const [viewMode, setViewMode] = useState('pre') // 'pre' | 'single' | 'all'
  const [currentIdx, setCurrentIdx] = useState(0)
  const [openCount, setOpenCount] = useState(0)

  // 팩 뜯기 드래그
  const [dragState, setDragState] = useState('idle')
  const [dragX, setDragX] = useState(0)
  const [tearDir, setTearDir] = useState(1)

  // 카드 상태
  const [cardFlipped, setCardFlipped] = useState(false)
  const [cardState, setCardState] = useState('idle') // 'idle' | 'exiting' | 'entering'

  // 카드 확대 모달
  const [expandedCard, setExpandedCard] = useState(null)

  const packRef = useRef(null)
  const tearStartX = useRef(0)
  const canOpen = !loading && !error && cards.length > 0

  // 카드 기울임 트래킹
  const tiltRef = useRef(null)
  const tiltRafRef = useRef(null)

  // 모달 홀로 트래킹
  const modalRef = useRef(null)
  const modalRafRef = useRef(null)

  const handleModalMove = useCallback((e) => {
    if (modalRafRef.current) return
    modalRafRef.current = requestAnimationFrame(() => {
      modalRafRef.current = null
      const el = modalRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = clamp(round((100 / rect.width)  * (e.clientX - rect.left)))
      const y = clamp(round((100 / rect.height) * (e.clientY - rect.top)))
      const cx = x - 50
      const cy = y - 50
      const fromCenter = round(clamp(Math.sqrt(cx * cx + cy * cy) / 50, 0, 1), 3)
      el.style.setProperty('--pointer-x',           `${x}%`)
      el.style.setProperty('--pointer-y',           `${y}%`)
      el.style.setProperty('--rotate-x',            `${round(-cx / 3.5)}deg`)
      el.style.setProperty('--rotate-y',            `${round(cy / 3.5)}deg`)
      el.style.setProperty('--card-opacity',        '1')
      el.style.setProperty('--pointer-from-center', fromCenter)
      el.style.setProperty('--pointer-from-left',   round(x / 100, 3))
      el.style.setProperty('--pointer-from-top',    round(y / 100, 3))
      el.style.setProperty('--background-x',        `${adjust(x, 0, 100, 37, 63)}%`)
      el.style.setProperty('--background-y',        `${adjust(y, 0, 100, 33, 67)}%`)
    })
  }, [])

  const handleModalLeave = useCallback(() => {
    if (modalRafRef.current) { cancelAnimationFrame(modalRafRef.current); modalRafRef.current = null }
    const el = modalRef.current
    if (!el) return
    el.style.setProperty('--rotate-x',           '0deg')
    el.style.setProperty('--rotate-y',           '0deg')
    el.style.setProperty('--card-opacity',        '0')
    el.style.setProperty('--pointer-from-center', '0')
  }, [])

  const handleTiltMove = useCallback((e) => {
    if (tiltRafRef.current) return
    tiltRafRef.current = requestAnimationFrame(() => {
      tiltRafRef.current = null
      const el = tiltRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = clamp(round((100 / rect.width)  * (e.clientX - rect.left)))
      const y = clamp(round((100 / rect.height) * (e.clientY - rect.top)))
      const cx = x - 50
      const cy = y - 50
      const fromCenter = round(clamp(Math.sqrt(cx * cx + cy * cy) / 50, 0, 1), 3)
      el.style.setProperty('--pointer-x',           `${x}%`)
      el.style.setProperty('--pointer-y',           `${y}%`)
      el.style.setProperty('--rotate-x',            `${round(-cx / 3.5)}deg`)
      el.style.setProperty('--rotate-y',            `${round(cy / 3.5)}deg`)
      el.style.setProperty('--card-opacity',        '1')
      el.style.setProperty('--pointer-from-center', fromCenter)
      el.style.setProperty('--pointer-from-left',   round(x / 100, 3))
      el.style.setProperty('--pointer-from-top',    round(y / 100, 3))
      el.style.setProperty('--background-x',        `${adjust(x, 0, 100, 37, 63)}%`)
      el.style.setProperty('--background-y',        `${adjust(y, 0, 100, 33, 67)}%`)
    })
  }, [])

  const handleTiltLeave = useCallback(() => {
    if (tiltRafRef.current) { cancelAnimationFrame(tiltRafRef.current); tiltRafRef.current = null }
    const el = tiltRef.current
    if (!el) return
    el.style.setProperty('--rotate-x',           '0deg')
    el.style.setProperty('--rotate-y',           '0deg')
    el.style.setProperty('--card-opacity',        '0')
    el.style.setProperty('--pointer-from-center', '0')
  }, [])

  // 팩 오픈
  function triggerOpen() {
    if (!cards.length) return
    const newPack = simulatePack(cards, PACK_SIZE)
    setPack(newPack)
    setOpenCount(c => c + 1)
    setCurrentIdx(0)
    setCardFlipped(false)
    setCardState('idle')
    setViewMode('single')
  }

  function resetForNext() {
    setViewMode('pre')
    setDragState('idle')
    setDragX(0)
    setPack([])
    setCurrentIdx(0)
    setCardFlipped(false)
    setCardState('idle')
  }

  useEffect(() => {
    resetForNext()
    setOpenCount(0)
  }, [set.set_name])

  // --- 팩 뜯기 이벤트 ---
  function handleTearDown(e) {
    if (!canOpen || dragState !== 'idle') return
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const rect = packRef.current?.getBoundingClientRect()
    if (!rect || clientY - rect.top > rect.height * 0.15) return
    tearStartX.current = e.touches ? e.touches[0].clientX : e.clientX
    setDragState('dragging')
    setDragX(0)
    e.preventDefault()
  }

  function handleTearMove(e) {
    if (dragState !== 'dragging') return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    setDragX(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, clientX - tearStartX.current)))
  }

  function handleTearUp() {
    if (dragState !== 'dragging') return
    if (Math.abs(dragX) >= TEAR_THRESHOLD) {
      setTearDir(dragX > 0 ? 1 : -1)
      setDragState('torn')
      setTimeout(() => {
        triggerOpen()
        setDragState('idle')
        setDragX(0)
      }, 480)
    } else {
      setDragX(0)
      setDragState('idle')
    }
  }

  // --- 카드 클릭 이벤트 ---
  function handleCardClick() {
    if (cardState !== 'idle') return

    if (!cardFlipped) {
      setCardFlipped(true)
    } else {
      setCardState('exiting')
      setTimeout(() => {
        const next = currentIdx + 1
        if (next >= pack.length) {
          setViewMode('all')
          setCardState('idle')
          return
        }
        setCurrentIdx(next)
        setCardFlipped(false)
        setCardState('entering')
        setTimeout(() => setCardState('idle'), 400)
      }, 320)
    }
  }

  // --- 팩 뜯기 스타일 계산 ---
  const isTorn = dragState === 'torn'
  const flyClass = isTorn ? (tearDir > 0 ? 'flying-right' : 'flying-left') : ''
  const progress = dragState === 'dragging' ? Math.min(1, Math.abs(dragX) / TEAR_THRESHOLD) : 0
  const rollPct = Math.max(0, (1 - progress) * 100)
  const dynamicClip = dragX >= 0
    ? `polygon(${100 - rollPct}% 0, 100% 0, 100% 10%, ${100 - rollPct}% 10%)`
    : `polygon(0 0, ${rollPct}% 0, ${rollPct}% 10%, 0 10%)`
  const topStyle = isTorn ? undefined : { clipPath: dynamicClip }

  return (
    <div className="opener">
      {/* 헤더 */}
      <div className="opener-header">
        <button className="back-btn" onClick={onBack}>← 팩 목록</button>
        <div className="set-info">
          <h2 className="set-title">{set.set_name}</h2>
          <span className="set-meta">
            {set.set_code} · {set.num_of_cards}종 카드
            {set.tcg_date && ` · ${set.tcg_date.slice(0, 10)}`}
          </span>
        </div>
        {openCount > 0 && <span className="open-count">×{openCount}</span>}
      </div>

      {loading && <div className="status-box"><div className="spinner" /><p>카드 정보 불러오는 중…</p></div>}
      {error && (
        <div className="status-box error">
          <p>⚠ {error}</p>
          <button className="btn-primary" onClick={onBack}>돌아가기</button>
        </div>
      )}

      {/* 팩 뜯기 화면 */}
      {!loading && !error && viewMode === 'pre' && (
        <div className="pre-open">
          {set.set_image ? (
            <div
              ref={packRef}
              className={`pack-tear-wrap ${dragState} ${!canOpen ? 'disabled' : ''}`}
              onMouseDown={handleTearDown}
              onMouseMove={handleTearMove}
              onMouseUp={handleTearUp}
              onMouseLeave={handleTearUp}
              onTouchStart={handleTearDown}
              onTouchMove={handleTearMove}
              onTouchEnd={handleTearUp}
            >
              <img src={set.set_image} alt="" className="pack-img pack-img-bottom" draggable={false} />
              <img
                src={set.set_image}
                alt={set.set_name}
                className={`pack-img pack-img-top ${flyClass}`}
                style={topStyle}
                draggable={false}
              />
              {canOpen && dragState === 'idle' && (
                <div className="drag-hint">← 옆으로 당겨서 열기 →</div>
              )}
            </div>
          ) : (
            <button className="btn-open" onClick={triggerOpen} disabled={!canOpen}>팩 열기</button>
          )}
          <p className="hint">카드 {PACK_SIZE}장 · {cards.length}종 중에서 추첨</p>
        </div>
      )}

      {/* 카드 한 장씩 보기 */}
      {viewMode === 'single' && pack[currentIdx] && (
        <div className="single-view">
          <p className="card-counter">{currentIdx + 1} / {pack.length}</p>
          <div
            className={`card-flip-outer${cardState === 'exiting' ? ' exiting' : ''}${cardState === 'entering' ? ' entering' : ''}`}
            onClick={handleCardClick}
          >
            {/* 기울임 트래킹: 카드 뒤집기 밖에서 마우스를 추적 */}
            <div
              ref={tiltRef}
              className="card-tilt-wrap"
              onMouseMove={handleTiltMove}
              onMouseLeave={handleTiltLeave}
            >
              <div className="card-tilt">
                <div
                  key={`card-${currentIdx}`}
                  className={`card-flip-inner${cardFlipped ? ' flipped' : ''}`}
                >
                  <div className="card-face card-face-back">
                    <img src={`${import.meta.env.BASE_URL}cardback.jpg`} alt="카드 뒷면" draggable={false} />
                  </div>
                  <div className="card-face card-face-front">
                    <HoloCard
                      imageUrl={pack[currentIdx]?.card_images?.[0]?.image_url_small || `${import.meta.env.BASE_URL}cardback.jpg`}
                      rarityTier={pack[currentIdx]?.rarityTier || 'common'}
                      alt={pack[currentIdx]?.name || ''}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="swipe-hint">
            {cardFlipped ? '클릭하여 다음 카드' : '클릭하여 카드 확인'}
          </p>
        </div>
      )}

      {/* 전체 카드 요약 */}
      {viewMode === 'all' && (
        <>
          <div className="cards-row">
            {pack.map((card, i) => (
              <div key={`${openCount}-${i}`} className="card-reveal-btn" onClick={() => setExpandedCard(card)}>
                <CardReveal card={card} revealed={true} index={i} />
              </div>
            ))}
          </div>
          <div className="post-open">
            <button className="btn-open" onClick={resetForNext}>다시 열기</button>
            <button className="btn-secondary" onClick={onBack}>다른 팩 선택</button>
          </div>
        </>
      )}

      {/* 카드 확대 모달 */}
      {expandedCard && (
        <div className="card-modal" onClick={() => setExpandedCard(null)}>
          <div
            ref={modalRef}
            className="card-modal-holo-wrap"
            onClick={e => e.stopPropagation()}
            onMouseMove={handleModalMove}
            onMouseLeave={handleModalLeave}
          >
            <div className="card-modal-tilt">
              <HoloCard
                imageUrl={expandedCard.card_images[0]?.image_url ?? expandedCard.card_images[0]?.image_url_small}
                rarityTier={expandedCard.rarityTier || 'common'}
                alt={expandedCard.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
