export const conditionColor: Record<string, { bg: string, text: string, border: string }> = {
  ANY: { bg: '#2a2a2a', text: '#888', border: '#444' },
  M:   { bg: '#ffd700', text: '#000', border: '#b8960c' },
  NM:  { bg: '#22c55e', text: '#000', border: '#15803d' },
  LP:  { bg: '#86efac', text: '#000', border: '#16a34a' },
  MP:  { bg: '#facc15', text: '#000', border: '#ca8a04' },
  HP:  { bg: '#f97316', text: '#000', border: '#c2410c' },
  DMG: { bg: '#ef4444', text: '#fff', border: '#b91c1c' },
};

export const languageCountry: Record<string, string> = {
  BR: 'BR',
  EN: 'US',
  JP: 'JP',
};

export const CONDITIONS = ['M', 'NM', 'LP', 'MP', 'HP', 'DMG'] as const;
export const LANGUAGES = ['BR', 'EN', 'JP'] as const;
