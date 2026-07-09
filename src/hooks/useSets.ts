import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SetItem } from '../types'

let cachedSets: SetItem[] | null = null;

const useSets = () => {
  const [sets, setSets] = useState<SetItem[]>(cachedSets ?? []);
  const [loading, setLoading] = useState(!cachedSets);

  useEffect(() => {
    if (cachedSets) return;

    supabase
      .from('sets')
      .select('id, name, serie, release_date, ptcgo_code, logo_url, total, official_count')
      .order('release_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        cachedSets = data ?? [];
        setSets(cachedSets);
        setLoading(false);
      });
  }, []);

  const seriesWithDate = [...new Set(
    sets.filter(s => s.release_date)
      .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
      .map(s => s.serie)
  )];

  const seriesWithoutDate = [...new Set(
    sets.filter(s => !s.release_date).map(s => s.serie)
  )].filter(s => !seriesWithDate.includes(s));

  const seriesOrder = [...seriesWithDate, ...seriesWithoutDate].filter(s => s !== 'Other');
  seriesOrder.push('Other');

  const setsBySerie = (serie: string) =>
    sets
      .filter(s => s.serie === serie)
      .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));

  const invalidate = () => {
    cachedSets = null;
  };

  return { sets, loading, seriesOrder, setsBySerie, invalidate };
};

export default useSets
