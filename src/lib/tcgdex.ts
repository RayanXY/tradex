const PRIMARY = 'https://api.na2.tcgdex.net';
const FALLBACK = 'https://api.tcgdex.net';

export async function tcgdexFetch(path: string): Promise<Response> {
  const primary = `${PRIMARY}/${path}`;
  const fallback = `${FALLBACK}/${path}`;

  try {
    const res = await fetch(primary, { signal: AbortSignal.timeout(4000) });
    if (res.ok) return res;
    throw new Error(`HTTP ${res.status}`);
  } catch {
    return fetch(fallback);
  }
}
