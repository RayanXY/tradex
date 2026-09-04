import type { CardVariant } from '../constants/variants';

export const FOIL_MAP: Record<string, CardVariant> = {
  pokeball: 'pokeball',
  masterball: 'masterball',
  cosmos: 'cosmos',
  energy: 'energy_pattern',
  league: 'league',
};

export const TYPE_MAP: Record<string, CardVariant> = {
  normal: 'normal',
  holo: 'holo',
  reverse: 'reverse',
};

export const resolveAllowedVariants = (data: any): CardVariant[] | null => {
  const details = Array.isArray(data.variants_detailed) ? data.variants_detailed : [];
  if (details.length === 0) return null;

  const resolved: CardVariant[] = [];
  for (const d of details) {
    const mapped = (d.foil && FOIL_MAP[d.foil]) ?? (!d.foil && TYPE_MAP[d.type]);
    if (!mapped) return null;
    if (!resolved.includes(mapped)) resolved.push(mapped);
  }

  if (data.variants?.wPromo) resolved.push('promo');
  return resolved;
}
