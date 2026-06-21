import { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { HoloCard } from '../components/HoloCard'
import './HoloDemoPage.css'

const DEMO_IMAGE = 'https://images.ygoprodeck.com/images/cards_small/89631139.jpg'

const EFFECTS = [
  { id: 'common', name: 'Common (일반)',  desc: '은은한 빛 반사만',       tag: '현재 일반 카드' },
  { id: 'rare',   name: 'Blue Shimmer',  desc: '청색 물결 shimmer',      tag: '현재 레어' },
  { id: 'super',  name: 'Sunpillar',     desc: '무지개 세로 빛 기둥',     tag: '현재 슈퍼 레어' },
  { id: 'ultra',  name: 'Retro Rainbow', desc: '빈티지 사선 무지개',      tag: '현재 울트라 레어' },
  { id: 'secret', name: 'Prismatic Glitter', desc: '프리즘 글리터 파티클', tag: '현재 시크릿 레어' },
  { id: 'gold',   name: 'Gold Foil',     desc: '황금 금박 광택',          tag: '추가 옵션' },
  { id: 'cosmos', name: 'Cosmos',        desc: '딥 스페이스 / 은하',      tag: '추가 옵션' },
  { id: 'chrome', name: 'Chrome',        desc: '크롬 / 실버 메탈',        tag: '추가 옵션' },
  { id: 'retro',  name: 'Retro Rainbow', desc: '빈티지 사선 무지개',      tag: '추가 옵션' },
  { id: 'pink',   name: 'Pink Holo',     desc: '핑크 홀로그램',           tag: '추가 옵션' },
]

const TAG_COLORS = {
  '현재 일반 카드':  '#64748b',
  '현재 레어':       '#60a5fa',
  '현재 슈퍼 레어':  '#f472b6',
  '현재 울트라 레어':'#fbbf24',
  '현재 시크릿 레어':'#e879f9',
  '추가 옵션':       '#34d399',
}

function round(v, p = 3) { return parseFloat(v.toFixed(p)) }
function clamp(v, min = 0, max = 100) { return Math.min(Math.max(v, min), max) }
function adjust(v, fMin, fMax, tMin, tMax) { return round(tMin + (tMax - tMin) * (v - fMin) / (fMax - fMin)) }

function DemoCard({ fx }) {
  const wrapRef = useRef(null)
  const rafRef  = useRef(null)

  const handleMove = useCallback((e) => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x  = clamp(round((100 / rect.width)  * (e.clientX - rect.left)))
      const y  = clamp(round((100 / rect.height) * (e.clientY - rect.top)))
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

  const handleLeave = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    const el = wrapRef.current
    if (!el) return
    el.style.setProperty('--rotate-x',           '0deg')
    el.style.setProperty('--rotate-y',           '0deg')
    el.style.setProperty('--card-opacity',        '0')
    el.style.setProperty('--pointer-from-center', '0')
  }, [])

  const tagColor = TAG_COLORS[fx.tag]

  return (
    <div
      ref={wrapRef}
      className="demo-item"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="demo-card-wrap">
        <div className="demo-card-tilt">
          <HoloCard imageUrl={DEMO_IMAGE} rarityTier={fx.id} alt={fx.name} />
        </div>
      </div>
      <div className="demo-info">
        <span
          className="demo-tag"
          style={{ background: tagColor + '22', color: tagColor, borderColor: tagColor + '55' }}
        >
          {fx.tag}
        </span>
        <p className="demo-name">{fx.name}</p>
        <p className="demo-desc">{fx.desc}</p>
      </div>
    </div>
  )
}

export function HoloDemoPage() {
  const navigate = useNavigate()

  return (
    <div className="demo-page">
      <div className="demo-header">
        <button className="demo-back" onClick={() => navigate('/')}>← 돌아가기</button>
        <h1 className="demo-title">홀로 효과 갤러리</h1>
        <p className="demo-subtitle">마우스를 카드 위로 올려서 효과를 확인하세요</p>
      </div>

      <div className="demo-grid">
        {EFFECTS.map((fx) => <DemoCard key={fx.id} fx={fx} />)}
      </div>

      <p className="demo-footer">
        원하는 효과를 레어도에 적용하려면 어느 레어도에 어떤 효과를 쓸지 알려주세요
      </p>
    </div>
  )
}
