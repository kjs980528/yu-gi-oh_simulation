import { useState, useEffect } from 'react'
import './MetaPage.css'

const TIER_CONFIG = {
  T0:    { label: 'Tier 0', color: '#ff4757' },
  T1:    { label: 'Tier 1', color: '#ff6348' },
  T2:    { label: 'Tier 2', color: '#ffa502' },
  T3:    { label: 'Tier 3', color: '#2ed573' },
  Rogue: { label: 'Rogue',  color: '#a29bfe' },
}

const META_DATA = [
  {
    tier: 'T0',
    decks: [
      { name: '스네이크 아이', nameEn: 'Snake-Eye',    style: '전개형',       desc: '화염 속성 몬스터를 연속 전개해 압도적인 필드를 구축. 스네이크 아이 애쉬를 중심으로 자원 순환이 뛰어남.', keyCard: 'Snake-Eye Ash',          weight: 50 },
    ],
  },
  {
    tier: 'T1',
    decks: [
      { name: '천배룡',        nameEn: 'Tenpai Dragon', style: '번 데미지형',  desc: '배틀 페이즈 중 드래곤족 싱크로 소환으로 막대한 번 데미지를 입히는 공격적인 덱.', keyCard: 'Tenpai Dragon Paidra',   weight: 19 },
      { name: '유벨',          nameEn: 'Yubel',          style: '컨트롤형',     desc: '유벨 시리즈 카드로 상대 몬스터를 역이용하는 컨트롤 덱. 나이트메어 페인으로 필드를 장악.', keyCard: 'Yubel',                weight: 22 },
    ],
  },
  {
    tier: 'T2',
    decks: [
      { name: '낙인',          nameEn: 'Branded',        style: '융합형',       desc: '알버스의 낙윤을 핵심으로 강력한 융합 몬스터를 소환하는 제압형 덱.', keyCard: 'Branded Fusion',           weight: 2  },
      { name: '라뷰린스',      nameEn: 'Labrynth',       style: '함정 컨트롤',  desc: 'Big Welcome Labrynth를 중심으로 함정 카드로 상대를 묶는 컨트롤 덱.', keyCard: 'Labrynth Cooclock',        weight: 1  },
      { name: '데먼스미스',    nameEn: 'Fiendsmith',     style: '링크 전개형',  desc: '악마족 특수 소환을 연쇄하며 링크 몬스터를 전개하는 콤보 덱.', keyCard: 'Fiendsmith Engraver',          weight: 1  },
    ],
  },
  {
    tier: 'T3',
    decks: [
      { name: '레스큐-ACE',    nameEn: 'Rescue-ACE',     style: '함정 전개형',  desc: '함정으로 상대를 제압하며 화염 속성 몬스터를 전개하는 준수한 범용성의 덱.', keyCard: 'Rescue-ACE Turbulence', weight: 1  },
      { name: '센추리온',      nameEn: 'Centurion',      style: '싱크로형',     desc: '지속 마법/함정을 활용해 레거시아를 주축으로 강력한 제압 필드를 구성.', keyCard: 'Centurion Legatia',       weight: 1  },
    ],
  },
  {
    tier: 'Rogue',
    decks: [
      { name: '엑소시스터',    nameEn: 'Exosister',      style: '대항마형',     desc: '묘지 활용에 의존하는 덱을 강력하게 카운터. 엑시즈 몬스터로 빠른 제압.', keyCard: 'Exosister Elis',          weight: 1  },
      { name: '밴퀴시 소울',   nameEn: 'Vanquish Soul',  style: '배틀형',       desc: '전투 페이즈에 특수 소환 및 효과를 발동하는 독특한 배틀 중심 덱.', keyCard: 'Vanquish Soul Razen',      weight: 1  },
      { name: '크샤트리라',    nameEn: 'Kashtira',       style: '봉쇄형',       desc: '상대 카드를 제외하여 자원을 봉쇄하는 통제형 덱. 페니릴로 빠른 전개.', keyCard: 'Kashtira Fenrir',          weight: 1  },
    ],
  },
]

const ALL_DECKS = META_DATA.flatMap(({ tier, decks }) =>
  decks.map(deck => ({ ...deck, tier }))
)

// ── 전체 카드 이미지 일괄 로드 ────────────────
function useCardImages(cardNames) {
  const [images, setImages] = useState({})

  useEffect(() => {
    let cancelled = false
    cardNames.forEach(name => {
      fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(json => {
          const url = json.data?.[0]?.card_images?.[0]?.image_url_cropped
          if (!cancelled && url) setImages(prev => ({ ...prev, [name]: url }))
        })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [])

  return images
}

// ── SVG 파이차트 유틸 ──────────────────────────
function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutSlicePath(cx, cy, R, ri, a1, a2) {
  const s  = polar(cx, cy, R,  a1)
  const e  = polar(cx, cy, R,  a2)
  const si = polar(cx, cy, ri, a1)
  const ei = polar(cx, cy, ri, a2)
  const lg = a2 - a1 > 180 ? 1 : 0
  return [
    `M ${si.x} ${si.y}`,
    `L ${s.x} ${s.y}`,
    `A ${R} ${R} 0 ${lg} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${ri} ${ri} 0 ${lg} 0 ${si.x} ${si.y}`,
    'Z',
  ].join(' ')
}

function MetaPieChart({ images }) {
  const CX = 170, CY = 170
  const R = 148, RI = 0
  const GAP = 0.8

  const totalWeight = ALL_DECKS.reduce((s, d) => s + (d.weight ?? 1), 0)

  let cumDeg = 0
  const slices = ALL_DECKS.map((deck, i) => {
    const w    = deck.weight ?? 1
    const span = (w / totalWeight) * 360
    const a1   = -90 + cumDeg + GAP / 2
    const a2   = -90 + cumDeg + span - GAP / 2
    const mid  = -90 + cumDeg + span / 2
    cumDeg    += span
    return { deck, i, a1, a2, mid, span }
  })

  return (
    <div className="meta-pie-wrap">
      <svg width="340" height="340" viewBox="0 0 340 340">
        <defs>
          {slices.map(({ i, a1, a2 }) => (
            <clipPath key={i} id={`sc-${i}`}>
              <path d={donutSlicePath(CX, CY, R, RI, a1, a2)} />
            </clipPath>
          ))}
        </defs>

        {slices.map(({ deck, i, a1, a2, mid, span }) => {
          const color = TIER_CONFIG[deck.tier].color
          const img   = images[deck.keyCard]
          const path  = donutSlicePath(CX, CY, R, RI, a1, a2)
          const pct   = ((deck.weight ?? 1) / totalWeight * 100).toFixed(1)

          return (
            <g key={deck.nameEn}>
              {/* 이미지가 없을 때 색상 폴백 */}
              <path d={path} fill={color} opacity={0.5} />

              {/* 슬라이스 전체를 카드 일러스트로 채움 */}
              {img && (
                <image
                  href={img}
                  x={CX - R}
                  y={CY - R}
                  width={R * 2}
                  height={R * 2}
                  clipPath={`url(#sc-${i})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              )}

              {/* 티어 색상 반투명 오버레이 */}
              <path d={path} fill={color} opacity={0.18} />

              {/* 슬라이스 구분선 */}
              <path d={path} fill="none" stroke="rgba(10,14,24,0.85)" strokeWidth="1.5" />

              {/* 큰 슬라이스에 퍼센트 표시 */}
              {span >= 20 && (
                <text
                  x={polar(CX, CY, R + 14, mid).x}
                  y={polar(CX, CY, R + 14, mid).y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#94a3b8"
                  fontSize="10"
                >
                  {pct}%
                </text>
              )}
            </g>
          )
        })}

      </svg>

      {/* 범례 */}
      <div className="meta-pie-legend">
        {ALL_DECKS.map(deck => {
          const cfg = TIER_CONFIG[deck.tier]
          const pct = ((deck.weight ?? 1) / totalWeight * 100).toFixed(1)
          return (
            <div key={deck.nameEn} className="meta-pie-legend-item">
              <span className="meta-pie-legend-dot" style={{ background: cfg.color }} />
              <span className="meta-pie-legend-label" style={{ color: cfg.color }}>{deck.name}</span>
              <span className="meta-pie-legend-count">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 덱 카드 ────────────────────────────────────
function DeckCard({ deck, tierColor, imgUrl }) {
  return (
    <div className="meta-deck-card">
      <div className="meta-deck-img">
        {imgUrl
          ? <img src={imgUrl} alt={deck.keyCard} />
          : <div className="meta-deck-img-placeholder" />
        }
      </div>
      <div className="meta-deck-body">
        <div className="meta-deck-names">
          <span className="meta-deck-name">{deck.name}</span>
          <span className="meta-deck-name-en">{deck.nameEn}</span>
        </div>
        <span className="meta-deck-style" style={{ background: tierColor + '22', color: tierColor, borderColor: tierColor + '55' }}>
          {deck.style}
        </span>
        <p className="meta-deck-desc">{deck.desc}</p>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────
export function MetaPage() {
  const images = useCardImages(ALL_DECKS.map(d => d.keyCard))

  return (
    <div className="meta-page">
      <div className="meta-header">
        <h1 className="meta-title">메타 티어리스트</h1>
        <p className="meta-subtitle">2025년 상반기 TCG 기준 · 정적 데이터 (예시)</p>
      </div>

      <MetaPieChart images={images} />

      <div className="meta-tiers">
        {META_DATA.map(({ tier, decks }) => {
          const cfg = TIER_CONFIG[tier]
          return (
            <div key={tier} className="meta-tier-section">
              <div className="meta-tier-heading">
                <span
                  className="meta-tier-label"
                  style={{ background: cfg.color + '22', color: cfg.color, borderColor: cfg.color + '55' }}
                >
                  {cfg.label}
                </span>
                <div className="meta-tier-line" style={{ background: cfg.color + '33' }} />
              </div>
              <div className="meta-decks-grid">
                {decks.map(deck => (
                  <DeckCard
                    key={deck.nameEn}
                    deck={deck}
                    tierColor={cfg.color}
                    imgUrl={images[deck.keyCard]}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
