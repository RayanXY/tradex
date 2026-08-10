import { useState } from "react"
import { supabase } from "../lib/supabase"

export interface PokemonCard {
  id: string,
  name: string,
  name_pt: string | null,
  set: {
    id: string,
    name: string,
    ptcgo_code?: string | null,
  },
  localId: string,
  image: string
}

const BASE_EN = "https://api.tcgdex.net/v2/en";
const BASE_PT = "https://api.tcgdex.net/v2/pt";

let validSetIds: Set<string> | null = null;

const loadValidSets = async () => {
  if (validSetIds) return;
  const { data } = await supabase.from('sets').select('id');
  validSetIds = new Set((data ?? []).map((s: { id: string }) => s.id));
};

const usePokemonSearch = () => {
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    if (!query.trimStart()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    await loadValidSets();

    const trimmed = query.trimStart();
    const setNumberPattern = /^([a-zA-Z0-9]+)[\s-](\d+)$/;
    const match = trimmed.match(setNumberPattern);

    try {
      let cards: PokemonCard[] = [];

      if (match) {
        const userCode = match[1].toUpperCase();
        const localId = match[2];

        const { data: setData } = await supabase
          .from('sets')
          .select('id, name, ptcgo_code')
          .or(`ptcgo_code.eq.${userCode},id.eq.${userCode.toLowerCase()}`)
          .limit(1);

        if (!setData || setData.length === 0) {
          setError('Set não encontrado. Tente o nome da carta.');
          setLoading(false);
          return;
        }

        const setId = setData[0].id;
        const setName = setData[0].name;
        const setPtcgo = setData[0].ptcgo_code ?? null;

        const withZeros = `${setId}-${localId}`;
        const withoutZeros = `${setId}-${parseInt(localId)}`;

        const [res1, res2] = await Promise.all([
          fetch(`${BASE_EN}/cards/${withZeros}`),
          fetch(`${BASE_EN}/cards/${withoutZeros}`),
        ]);

        const fetched = await Promise.all([
          res1.ok ? res1.json() : null,
          res2.ok ? res2.json() : null,
        ]);

        const seen = new Set<string>();
        for (const card of fetched) {
          if (card && card.id && !seen.has(card.id)) {
            seen.add(card.id);
            // Tenta buscar nome PT para carta específica
            let name_pt: string | null = null;
            try {
              const ptRes = await fetch(`${BASE_PT}/cards/${card.id}`);
              if (ptRes.ok) {
                const ptData = await ptRes.json();
                name_pt = ptData.name ?? null;
              }
            } catch { /* fallback silencioso */ }

            cards.push({
              id: card.id,
              name: card.name,
              name_pt,
              localId: card.localId,
              image: card.image ?? '',
              set: {
                id: card.set?.id ?? setId,
                name: card.set?.name ?? setName,
                ptcgo_code: setPtcgo,
              },
            });
          }
        }

        cards = cards.filter(c => c.image);
      } else {
        const fetchAllPages = async (base: string) => {
          let allCards: any[] = [];
          let currentPage = 1;
          let keepFetching = true;
          while (keepFetching) {
            const res = await fetch(
              `${base}/cards?name=${encodeURIComponent(trimmed)}&pagination:itemsPerPage=50&pagination:page=${currentPage}`
            );
            const data = await res.json();
            const raw = Array.isArray(data) ? data : [];
            allCards = [...allCards, ...raw];
            keepFetching = raw.length === 50;
            currentPage++;
          }
          return allCards;
        };

        const [ptRaw, enRaw] = await Promise.all([
          fetchAllPages(BASE_PT),
          fetchAllPages(BASE_EN),
        ]);

        const ptMap = new Map<string, any>();
        for (const c of ptRaw) {
          if (c.id) ptMap.set(c.id, c);
        }

        const seen = new Set<string>();
        const merged: PokemonCard[] = [];

        for (const c of enRaw) {
          if (!c.image || seen.has(c.id)) continue;
          seen.add(c.id);
          const pt = ptMap.get(c.id);
          merged.push({
            id: c.id,
            name: c.name,
            name_pt: pt?.name ?? null,
            localId: c.localId,
            image: c.image ?? '',
            set: {
              id: c.set?.id ?? c.id.split('-').slice(0, -1).join('-'),
              name: c.set?.name ?? '',
              ptcgo_code: null,
            },
          });
        }

        // Inclui cartas PT que não existem no EN (ex: nomes exclusivamente PT)
        for (const c of ptRaw) {
          if (!c.image || seen.has(c.id)) continue;
          seen.add(c.id);
          merged.push({
            id: c.id,
            name: c.name,
            name_pt: c.name,
            localId: c.localId,
            image: c.image ?? '',
            set: {
              id: c.set?.id ?? c.id.split('-').slice(0, -1).join('-'),
              name: c.set?.name ?? '',
              ptcgo_code: null,
            },
          });
        }

        cards = merged;
      }

      cards = cards.filter(c => (validSetIds?.has(c.set.id) ?? true) && c.image);

      if (cards.length === 0) {
        setError('Nenhuma carta encontrada.');
      } else {
        setResults(cards);
      }
    } catch {
      setError('Erro ao buscar cartas.');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResults([]);
  };

  return { results, loading, error, search, clear };
}

export const invalidateSetCache = () => {
  validSetIds = null;
}

export default usePokemonSearch
