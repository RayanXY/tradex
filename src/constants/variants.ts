export type CardVariant =
  | 'normal'
  | 'holo'
  | 'reverse'
  | 'energy_pattern'
  | 'pokeball'
  | 'masterball'
  | 'cosmos';

export interface VariantInfo {
  label: string;
  shortLabel: string;
  glow?: string;
}

export const VARIANTS: Record<CardVariant, VariantInfo> = {
  normal:         { label: 'Normal',         shortLabel: 'Normal' },
  holo:           { label: 'Holo',           shortLabel: 'Holo',       glow: '0 0 8px 2px #818cf8' },
  reverse:        { label: 'Reverse Holo',   shortLabel: 'Reverse',    glow: '0 0 8px 2px #94a3b8' },
  energy_pattern: { label: 'Energy Pattern', shortLabel: 'Energy',     glow: '0 0 8px 2px #f4d03f' },
  pokeball:       { label: 'Poké Ball',      shortLabel: 'Poké Ball',  glow: '0 0 8px 2px #e3350d' },
  masterball:     { label: 'Master Ball',    shortLabel: 'Master Ball',glow: '0 0 8px 2px #a855f7' },
  cosmos:         { label: 'Cosmos Holo',    shortLabel: 'Cosmos',     glow: '0 0 8px 2px #22d3ee' },
}

export const VARIANT_OPTIONS = Object.entries(VARIANTS).map(([value, info]) => ({
  value: value as CardVariant,
  label: info.label,
}));
