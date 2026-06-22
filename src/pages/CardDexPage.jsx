import { useState, useEffect, useRef, useCallback } from 'react'
import './CardDexPage.css'

const API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const PAGE_SIZE = 20
const DEBOUNCE_MS = 450
const MIN_REQ_INTERVAL = 60 // ensures well under 20 req/s

const ALL_MONSTER_TYPES = [
  'Effect Monster', 'Normal Monster', 'Ritual Monster', 'Ritual Effect Monster',
  'Fusion Monster', 'Synchro Monster', 'Xyz Monster', 'Link Monster',
  'Pendulum Effect Monster', 'Normal Pendulum Monster', 'Fusion Pendulum Monster',
  'Synchro Pendulum Monster', 'Xyz Pendulum Monster', 'Flip Effect Monster',
  'Flip Pendulum Effect Monster', 'Spirit Monster', 'Union Effect Monster', 'Gemini Monster',
].join(',')

const MONSTER_TYPE_MAP = {
  effect:   'Effect Monster',
  normal:   'Normal Monster',
  ritual:   'Ritual Monster,Ritual Effect Monster',
  fusion:   'Fusion Monster,Fusion Pendulum Monster',
  synchro:  'Synchro Monster,Synchro Pendulum Monster',
  xyz:      'Xyz Monster,Xyz Pendulum Monster',
  link:     'Link Monster',
  pendulum: 'Pendulum Effect Monster,Normal Pendulum Monster,Fusion Pendulum Monster,Synchro Pendulum Monster,Xyz Pendulum Monster,Flip Pendulum Effect Monster',
}

const MONSTER_TYPE_LABELS = {
  effect: '효과', normal: '일반', ritual: '의식', fusion: '융합',
  synchro: '싱크로', xyz: '엑시즈', link: '링크', pendulum: '펜듈럼',
}

const ATTRIBUTES = ['DARK', 'LIGHT', 'FIRE', 'WATER', 'EARTH', 'WIND', 'DIVINE']
const ATTRIBUTE_KR = {
  DARK: '어둠', LIGHT: '빛', FIRE: '화염', WATER: '물', EARTH: '땅', WIND: '바람', DIVINE: '신',
}

const MONSTER_RACES = [
  'Dragon', 'Spellcaster', 'Zombie', 'Warrior', 'Beast-Warrior', 'Beast',
  'Winged Beast', 'Fiend', 'Fairy', 'Insect', 'Dinosaur', 'Rock', 'Sea Serpent',
  'Fish', 'Machine', 'Thunder', 'Aqua', 'Pyro', 'Plant', 'Psychic',
  'Divine-Beast', 'Cyberse', 'Wyrm', 'Reptile', 'Illusion',
]
const MONSTER_RACE_KR = {
  Dragon: '드래곤족', Spellcaster: '마법사족', Zombie: '언데드족', Warrior: '전사족',
  'Beast-Warrior': '수전사족', Beast: '야수족', 'Winged Beast': '비행야수족',
  Fiend: '악마족', Fairy: '천사족', Insect: '곤충족', Dinosaur: '공룡족', Rock: '암석족',
  'Sea Serpent': '해룡족', Fish: '어류족', Machine: '기계족', Thunder: '뇌족',
  Aqua: '물족', Pyro: '화염족', Plant: '식물족', Psychic: '사이킥족',
  'Divine-Beast': '신족', Cyberse: '사이버스족', Wyrm: '환룡족', Reptile: '파충류족',
  Illusion: '환상마족',
}

const SPELL_RACES = ['Normal', 'Quick-Play', 'Field', 'Equip', 'Continuous', 'Ritual']
const SPELL_RACE_KR = {
  Normal: '일반', 'Quick-Play': '속공', Field: '필드', Equip: '장착', Continuous: '지속', Ritual: '의식',
}

const TRAP_RACES = ['Normal', 'Continuous', 'Counter']
const TRAP_RACE_KR = { Normal: '일반', Continuous: '지속', Counter: '카운터' }

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// 3×3 grid layout: null = center cell (non-interactive)
const LINK_MARKER_GRID = [
  ['Top-Left',    'Top',    'Top-Right'   ],
  ['Left',         null,    'Right'       ],
  ['Bottom-Left', 'Bottom', 'Bottom-Right'],
]
const LINK_MARKER_ARROW = {
  'Top-Left': '↖', 'Top': '↑', 'Top-Right': '↗',
  'Left': '←',                  'Right': '→',
  'Bottom-Left': '↙', 'Bottom': '↓', 'Bottom-Right': '↘',
}

const DEFAULT_FILTERS = {
  name: '',
  category: 'monster',
  monsterType: '',
  attribute: '',
  race: '',
  level: '',
  linkmarkers: [],
  spellRace: '',
  trapRace: '',
}

function buildUrl(filters, offset) {
  const p = new URLSearchParams()

  if (filters.name) p.set('fname', filters.name)

  if (filters.category === 'monster') {
    p.set('type', filters.monsterType ? MONSTER_TYPE_MAP[filters.monsterType] : ALL_MONSTER_TYPES)
    if (filters.attribute) p.set('attribute', filters.attribute)
    if (filters.race)      p.set('race', filters.race)
    if (filters.level)     p.set('level', filters.level)
    if (filters.linkmarkers.length) p.set('linkmarker', filters.linkmarkers.join(','))
  } else if (filters.category === 'spell') {
    p.set('type', 'Spell Card')
    if (filters.spellRace) p.set('race', filters.spellRace)
  } else if (filters.category === 'trap') {
    p.set('type', 'Trap Card')
    if (filters.trapRace) p.set('race', filters.trapRace)
  }

  p.set('num', String(PAGE_SIZE))
  p.set('offset', String(offset))

  return `${API_BASE}?${p}`
}

export function CardDexPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [cards, setCards]     = useState([])
  const [total, setTotal]     = useState(0)
  const [offset, setOffset]   = useState(0)
  const [loading, setLoading]         = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]     = useState(null)

  const abortRef    = useRef(null)
  const debounceRef = useRef(null)
  const lastReqTime = useRef(0)

  const doFetch = useCallback(async (currentFilters, currentOffset, replace) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    // rate limiter: min interval between requests
    const wait = MIN_REQ_INTERVAL - (Date.now() - lastReqTime.current)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    if (ctrl.signal.aborted) return
    lastReqTime.current = Date.now()

    if (replace) { setLoading(true); setError(null) }
    else setLoadingMore(true)

    try {
      const res  = await fetch(buildUrl(currentFilters, currentOffset), { signal: ctrl.signal })
      const json = await res.json()
      if (ctrl.signal.aborted) return

      if ('error' in json) {
        if (replace) { setCards([]); setTotal(0) }
        return
      }

      const rows = json.meta?.total_rows ?? json.data.length
      setTotal(rows)
      if (replace) setCards(json.data)
      else setCards(prev => [...prev, ...json.data])
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  // Debounced search when filters change
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setOffset(0)
      doFetch(filters, 0, true)
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [filters, doFetch])

  function loadMore() {
    const next = offset + PAGE_SIZE
    setOffset(next)
    doFetch(filters, next, false)
  }

  function toggleFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }))
  }

  function toggleLinkMarker(marker) {
    setFilters(prev => ({
      ...prev,
      linkmarkers: prev.linkmarkers.includes(marker)
        ? prev.linkmarkers.filter(m => m !== marker)
        : [...prev.linkmarkers, marker],
    }))
  }

  function setCategory(cat) {
    setFilters({ ...DEFAULT_FILTERS, name: filters.name, category: cat })
  }

  const hasMore = cards.length > 0 && cards.length < total

  return (
    <div className="dex">
      <div className="dex-filters">
        <input
          className="dex-search"
          type="text"
          placeholder="카드 이름 검색…"
          value={filters.name}
          onChange={e => setFilters(prev => ({ ...prev, name: e.target.value }))}
        />

        {/* Category */}
        <div className="dex-filter-row">
          {[['monster', '몬스터'], ['spell', '마법'], ['trap', '함정']].map(([val, label]) => (
            <button
              key={val}
              className={`dex-tag dex-tag--category${filters.category === val ? ' active' : ''}`}
              onClick={() => setCategory(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Monster sub-filters */}
        {filters.category === 'monster' && (
          <>
            <div className="dex-filter-group">
              <span className="dex-filter-label">카드 종류</span>
              <div className="dex-filter-row">
                {Object.entries(MONSTER_TYPE_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    className={`dex-tag${filters.monsterType === val ? ' active' : ''}`}
                    onClick={() => toggleFilter('monsterType', val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dex-filter-group">
              <span className="dex-filter-label">속성</span>
              <div className="dex-filter-row">
                {ATTRIBUTES.map(attr => (
                  <button
                    key={attr}
                    className={`dex-tag dex-tag--attr dex-tag--${attr.toLowerCase()}${filters.attribute === attr ? ' active' : ''}`}
                    onClick={() => toggleFilter('attribute', attr)}
                  >
                    {ATTRIBUTE_KR[attr]}
                  </button>
                ))}
              </div>
            </div>

            <div className="dex-filter-group">
              <span className="dex-filter-label">종족</span>
              <div className="dex-filter-row dex-filter-row--wrap">
                {MONSTER_RACES.map(race => (
                  <button
                    key={race}
                    className={`dex-tag dex-tag--sm${filters.race === race ? ' active' : ''}`}
                    onClick={() => toggleFilter('race', race)}
                  >
                    {MONSTER_RACE_KR[race]}
                  </button>
                ))}
              </div>
            </div>

            {filters.monsterType !== 'link' && (
              <div className="dex-filter-group">
                <span className="dex-filter-label">레벨 / 랭크</span>
                <div className="dex-filter-row">
                  {LEVELS.map(lv => (
                    <button
                      key={lv}
                      className={`dex-tag dex-tag--num${filters.level === String(lv) ? ' active' : ''}`}
                      onClick={() => toggleFilter('level', String(lv))}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filters.monsterType === 'link' && (
              <div className="dex-filter-group">
                <span className="dex-filter-label">링크 마커</span>
                <div className="link-marker-grid">
                  {LINK_MARKER_GRID.map((row, ri) =>
                    row.map((marker, ci) =>
                      marker === null ? (
                        <div key={`${ri}-${ci}`} className="link-marker-center">LINK</div>
                      ) : (
                        <button
                          key={marker}
                          className={`link-marker-btn${filters.linkmarkers.includes(marker) ? ' active' : ''}`}
                          onClick={() => toggleLinkMarker(marker)}
                          title={marker}
                        >
                          {LINK_MARKER_ARROW[marker]}
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Spell sub-filters */}
        {filters.category === 'spell' && (
          <div className="dex-filter-group">
            <span className="dex-filter-label">마법 종류</span>
            <div className="dex-filter-row">
              {SPELL_RACES.map(race => (
                <button
                  key={race}
                  className={`dex-tag${filters.spellRace === race ? ' active' : ''}`}
                  onClick={() => toggleFilter('spellRace', race)}
                >
                  {SPELL_RACE_KR[race]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trap sub-filters */}
        {filters.category === 'trap' && (
          <div className="dex-filter-group">
            <span className="dex-filter-label">함정 종류</span>
            <div className="dex-filter-row">
              {TRAP_RACES.map(race => (
                <button
                  key={race}
                  className={`dex-tag${filters.trapRace === race ? ' active' : ''}`}
                  onClick={() => toggleFilter('trapRace', race)}
                >
                  {TRAP_RACE_KR[race]}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && total > 0 && (
          <p className="dex-total">{total.toLocaleString()}장 검색됨</p>
        )}
      </div>

      {loading && (
        <div className="dex-status">
          <div className="dex-spinner" />
          <p>카드 검색 중…</p>
        </div>
      )}

      {!loading && error && <div className="dex-status dex-status--error">⚠ {error}</div>}

      {!loading && !error && cards.length === 0 && (
        <div className="dex-status">검색 결과가 없습니다.</div>
      )}

      {!loading && cards.length > 0 && (
        <>
          <div className="dex-grid">
            {cards.map(card => (
              <div key={card.id} className="dex-card">
                <img
                  src={card.card_images[0]?.image_url_small}
                  alt={card.name}
                  loading="lazy"
                />
                <div className="dex-card-info">
                  <span className="dex-card-name">{card.name}</span>
                  <span className="dex-card-sub">{card.race} {card.attribute ? `· ${card.attribute}` : ''}</span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button className="dex-load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? '불러오는 중…' : `더 보기 (${(total - cards.length).toLocaleString()}장 남음)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
