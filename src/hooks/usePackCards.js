import { useState, useEffect, useRef } from 'react'

const API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const cache = new Map()

export function usePackCards(setName) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!setName) {
      setCards([])
      return
    }

    if (cache.has(setName)) {
      setCards(cache.get(setName))
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    async function fetchCards() {
      try {
        const url = `${API_BASE}?cardset=${encodeURIComponent(setName)}`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('카드 정보를 불러오는데 실패했습니다')
        const json = await res.json()

        if ('error' in json) throw new Error(String(json.error))

        const data = json.data
        const processed = data.map(card => {
          const entry = card.card_sets?.find(s => s.set_name === setName)
          return { ...card, currentSetRarity: entry?.set_rarity ?? 'Common' }
        })

        cache.set(setName, processed)
        setCards(processed)
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
    return () => controller.abort()
  }, [setName])

  return { cards, loading, error }
}
