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

  const holos = [...groups.secret, ...groups.ultra, ...groups.super]
  const holo = pickRandom(holos.length ? holos : processed)
  if (holo) result.push(holo)

  const rareOrHigher = [...holos, ...groups.rare]
  const rareCard = pickRandom(rareOrHigher.length ? rareOrHigher : processed)
  if (rareCard) result.push(rareCard)

  const fillPool = groups.common.length ? groups.common : processed
  while (result.length < packSize) {
    const card = pickRandom(fillPool)
    if (card) result.push(card)
  }

  return result
}
