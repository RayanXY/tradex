export type CardVariant =
  | 'normal'
  | 'holo'
  | 'reverse'
  | 'promo'
  | 'pre_release'
  | 'pokeball'
  | 'energy_pattern'
  | 'masterball'
  |  'cosmos'
  | 'league';

export interface VariantInfo {
  label: string;
  shortLabel: string;
  glow?: string;
}

export const VARIANTS: Record<CardVariant, VariantInfo> = {
  normal:         { label: 'Normal',         shortLabel: 'Normal' },
  holo:           { label: 'Foil',           shortLabel: 'Foil',           glow: '0 0 8px 2px #818cf8' },
  reverse:        { label: 'Foil Reversa',   shortLabel: 'Reversa',        glow: '0 0 8px 2px #94a3b8' },
  promo:          { label: 'Promo',          shortLabel: 'Promo',          glow: '0 0 8px 2px #f4d03f' },
  pre_release:    { label: 'Pré-Lançamento', shortLabel: 'Pré-Lançamento', glow: '0 0 8px 2px #7c3aed' },
  energy_pattern: { label: 'Energia Foil',   shortLabel: 'Energia',        glow: '0 0 8px 2px #f4d03f' },
  pokeball:       { label: 'Poké Ball',      shortLabel: 'Poké Ball',      glow: '0 0 8px 2px #e3350d' },
  masterball:     { label: 'Master Ball',    shortLabel: 'Master Ball',    glow: '0 0 8px 2px #a855f7' },
  cosmos:         { label: 'Cosmos Foil',    shortLabel: 'Cosmos',         glow: '0 0 8px 2px #22d3ee' },
  league:         { label: 'Liga',           shortLabel: 'Liga',           glow: '0 0 8px 2px #10b981' },
}

export const VARIANT_OPTIONS = Object.entries(VARIANTS).map(([value, info]) => ({
  value: value as CardVariant,
  label: info.label,
}));
