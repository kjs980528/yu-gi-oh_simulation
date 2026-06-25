import { getRarityTier } from './rarityUtils'

function pickRandom(arr) {
  if (!arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export function simulatePack(cards, packSize = 5) {
  const processed = cards.map(card => ({
    ...card,
    rarityTier: getRarityTier(card.currentSetRarity),
  }))

  const groups = {
    secret: processed.filter(c => c.rarityTier === 'secret'),
    ultra: processed.filter(c => c.rarityTier === 'ultra'),
    super: processed.filter(c => c.rarityTier === 'super'),
    rare: processed.filter(c => c.rarityTier === 'rare'),
    common: processed.filter(c => c.rarityTier === 'common'),
  }

  const result = []

  const commonPool = groups.common.length ? groups.common : processed
  while (result.length < 3) {
    result.push(pickRandom(commonPool))
  }

  const rarePool = groups.rare.length ? groups.rare
                 : groups.common.length ? groups.common
                 : processed
  result.push(pickRandom(rarePool))

  const holoPool = [...groups.secret, ...groups.ultra, ...groups.super]
  result.push(pickRandom(holoPool.length ? holoPool : processed))

  return result
}
