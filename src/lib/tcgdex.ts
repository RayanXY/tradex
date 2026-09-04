const RACE_GROUP = [
  'https://api.tcgdex.net',
  'https://api.na1.tcgdex.net',
  'https://api.eu1.tcgdex.net',
  
];

const FALLBACK_GROUP = [
  'https://api.na2.tcgdex.net',
  'https://api.eu2.tcgdex.net',
];

const TIMEOUT_MS = 4000;

const fetchWithTimeout = (base: string, path: string) => fetch(`${base}/${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });

export async function tcgdexFetch(path: string): Promise<Response> {
  try {
    return await Promise.any(RACE_GROUP.map(base => fetchWithTimeout(base, path)));
  } catch { /* */ }

  for (const base of FALLBACK_GROUP) {
    try {
      return await fetchWithTimeout(base, path);
    } catch {
      continue;
    }
  }

  throw new Error(`Todos os endpoints TCGdex falharam para: ${path}`);
}
