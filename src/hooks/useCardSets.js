import { useState, useEffect } from 'react'
import packList from '../packList.json'

const SETS_URL = 'https://db.ygoprodeck.com/api/v7/cardsets.php'
const ALLOWED_PREFIXES = new Set(packList.map(p => p.pack_set_number))

export function useCardSets() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchSets() {
      try {
        const res = await fetch(SETS_URL)
        if (!res.ok) throw new Error('카드 세트 목록을 불러오는데 실패했습니다')
        const data = await res.json()
        if (!cancelled) {
          const allowed = data.filter(s => {
            const prefix = s.set_code.split('-')[0]
            return ALLOWED_PREFIXES.has(prefix) && s.num_of_cards > 0
          })

          const deduped = Object.values(
            allowed.reduce((acc, s) => {
              const key = s.set_code.split('-')[0]
              if (!acc[key] || s.num_of_cards > acc[key].num_of_cards) acc[key] = s
              return acc
            }, {})
          )

          const sorted = deduped.sort(
            (a, b) => new Date(b.tcg_date).getTime() - new Date(a.tcg_date).getTime()
          )
          setSets(sorted)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSets()
    return () => { cancelled = true }
  }, [])

  return { sets, loading, error }
}
