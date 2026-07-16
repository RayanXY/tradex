export type RarityTier = 'common' | 'uncommon' | 'rare' | 'ultra' | 'illustration' | 'secret' | 'shiny' | 'promo'

export const rarityTier: Record<string, RarityTier> = {
  // Common
  'Common': 'common',
  'None': 'common',

  // Uncommon
  'Uncommon': 'uncommon',

  // Rare
  'Rare': 'rare',
  'Rare Holo': 'rare',
  'Holo Rare': 'rare',

  // Ultra
  'Ultra Rare': 'ultra',
  'Double rare': 'ultra',
  'Holo Rare V': 'ultra',
  'Holo Rare VMAX': 'ultra',
  'Holo Rare VSTAR': 'ultra',
  'Rare Holo LV.X': 'ultra',
  'Rare PRIME': 'ultra',
  'LEGEND': 'ultra',

  // Illustration
  'Illustration rare': 'illustration',
  'Special illustration rare': 'illustration',
  'Full Art Trainer': 'illustration',

  // Secret
  'Secret Rare': 'secret',
  'Hyper rare': 'secret',
  'Mega Hyper Rare': 'secret',
  'Crown': 'secret',
  'Classic Collection': 'secret',
  'ACE SPEC Rare': 'secret',

  // Shiny
  'Shiny rare': 'shiny',
  'Shiny rare V': 'shiny',
  'Shiny rare VMAX': 'shiny',
  'Shiny Ultra Rare': 'shiny',
  'Radiant Rare': 'shiny',
  'Amazing Rare': 'shiny',
  'Black White Rare': 'shiny',

  // Promo
  'Promo': 'promo',
}

export const tierColor: Record<RarityTier, string> = {
  common: '#94a3b8',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  ultra: '#a855f7',
  illustration: '#ec4899',
  secret: '#f4d03f',
  shiny: '#06b6d4',
  promo: '#f97316',
}

export const tierLabel: Record<RarityTier, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  ultra: 'Ultra',
  illustration: 'Ilustração',
  secret: 'Secreta',
  shiny: 'Shiny',
  promo: 'Promo',
}

export const TIERS: RarityTier[] = ['common', 'uncommon', 'rare', 'ultra', 'illustration', 'secret', 'shiny', 'promo']

export const getRarityColor = (rarity: string | null | undefined): string | null => {
  if (!rarity) return null;
  const tier = rarityTier[rarity];
  return tier ? tierColor[tier] : null;
}
