const SECRET_KEYWORDS = ['Secret', 'Ghost', 'Starlight', 'Quarter Century', "Collector's", 'Pharaoh']
const ULTRA_KEYWORDS = ['Ultra Rare', 'Ultimate Rare', 'Gold Rare', 'Platinum Rare', 'Ghost/Gold']
const SUPER_KEYWORDS = ['Super Rare', 'Starfoil', 'Mosaic Rare', 'Shatterfoil']
const RARE_KEYWORDS = ['Short Print', ' Rare']

export function getRarityTier(rarity) {
  if (!rarity) return 'common'
  if (SECRET_KEYWORDS.some(k => rarity.includes(k))) return 'secret'
  if (ULTRA_KEYWORDS.some(k => rarity.includes(k))) return 'ultra'
  if (SUPER_KEYWORDS.some(k => rarity.includes(k))) return 'super'
  if (rarity === 'Rare' || RARE_KEYWORDS.some(k => rarity.includes(k))) return 'rare'
  return 'common'
}

export const RARITY_LABELS = {
  common: '일반',
  rare: '레어',
  super: '슈퍼 레어',
  ultra: '울트라 레어',
  secret: '시크릿 레어',
}

export const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#60a5fa',
  super: '#f472b6',
  ultra: '#fbbf24',
  secret: '#e879f9',
}
