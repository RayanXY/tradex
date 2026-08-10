import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SetItem } from '../types'

interface SerieItem {
  id: string,
  name: string,
  name_pt: string | null,
  order_index: number | null,
  tcgdex_serie_id: string | null
}

let cachedSets: SetItem[] | null = null;
let cachedSeries: SerieItem[] | null = null;

export const invalidateSetsCache = () => {
  cachedSets = null;
  cachedSeries = null;
};

const useSets = () => {
  const [sets, setSets] = useState<SetItem[]>(cachedSets ?? []);
  const [series, setSeries] = useState<SerieItem[]>(cachedSeries ?? []);
  const [loading, setLoading] = useState(!cachedSets);

  useEffect(() => {
    if (cachedSets && cachedSeries) return;

    Promise.all([
      supabase
        .from('sets')
        .select('id, name, name_pt, serie, serie_id, release_date, ptcgo_code, logo_url, logo_url_pt, symbol_url, order_index, enabled, total, official_count')
        .eq('enabled', true),
      supabase
        .from('series')
        .select('id, name, name_pt, order_index, tcgdex_serie_id')
        .order('order_index', { ascending: false, nullsFirst: false }),
    ]).then(([{ data: setsData }, { data: seriesData }]) => {
      cachedSets = (setsData ?? []).sort((a, b) =>
        (b.release_date ?? '').localeCompare(a.release_date ?? '')
      );
      cachedSeries = seriesData ?? [];
      setSets(cachedSets);
      setSeries(cachedSeries);
      setLoading(false);
    });
  }, []);

  const seriesOrder = series.map(s => s.id);

  const setsBySerie = (serieId: string) =>
    sets
      .filter(s => s.serie_id === serieId)
      .sort((a, b) => {
        if (a.order_index == null && b.order_index == null) return 0;
        if (a.order_index == null) return 1;
        if (b.order_index == null) return -1;
        return b.order_index - a.order_index;
      });

  const getSerieLabel = (serieId: string) => {
    const s = series.find(s => s.id === serieId);
    return s?.name_pt ?? s?.name ?? serieId;
  };

  const getSerieById = (serieId: string) => series.find(s => s.id === serieId);

  const invalidate = () => {
    cachedSets = null;
    cachedSeries = null;
  };

  return { sets, series, loading, seriesOrder, setsBySerie, getSerieLabel, getSerieById, invalidate }
}

export default useSets
