import { useState, useMemo } from 'react'
import { useCardSets } from '../hooks/useCardSets'
import './PackSelector.css'

const PAGE_SIZE = 30

export function PackSelector({ onSelect }) {
  const { sets, loading, error } = useCardSets()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return sets
    return sets.filter(
      s =>
        s.set_name.toLowerCase().includes(q) ||
        s.set_code.toLowerCase().includes(q),
    )
  }, [sets, query])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  function handleSearch(value) {
    setQuery(value)
    setPage(1)
  }

  if (loading) {
    return (
      <div className="selector-loading">
        <div className="big-spinner" />
        <p>카드팩 목록 불러오는 중…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="selector-error">
        <p>⚠ {error}</p>
      </div>
    )
  }

  return (
    <div className="selector">
      <div className="selector-header">
        <h2 className="selector-title">카드팩 선택</h2>
        <p className="selector-subtitle">{sets.length}개 팩 · 열고 싶은 팩을 선택하세요</p>
        <input
          className="search-input"
          type="text"
          placeholder="팩 이름 또는 코드 검색…"
          value={query}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <p className="no-results">검색 결과가 없습니다.</p>
      )}

      <div className="set-grid">
        {visible.map(set => (
          <button
            key={set.set_code}
            className="set-card"
            onClick={() => onSelect(set)}
          >
            <div className="set-card-image">
              {set.set_image ? (
                <img src={set.set_image} alt={set.set_name} loading="lazy" />
              ) : (
                <div className="set-card-placeholder">
                  <span>{set.set_code}</span>
                </div>
              )}
            </div>
            <div className="set-card-body">
              <span className="set-card-name">{set.set_name}</span>
              <span className="set-card-meta">
                {set.set_code} · {set.num_of_cards}종
              </span>
              {set.tcg_date && (
                <span className="set-card-date">{set.tcg_date.slice(0, 10)}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <button className="load-more" onClick={() => setPage(p => p + 1)}>
          더 보기 ({filtered.length - visible.length}개 남음)
        </button>
      )}
    </div>
  )
}
