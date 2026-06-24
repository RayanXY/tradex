import { useState } from "react"
import { supabase } from "../lib/supabase"

export interface PokemonCard {
  id: string,
  name: string,
  set: {
    id: string,
    name: string
  },
  localId: string,
  image: string
}

const BASE_URL = "https://api.tcgdex.net/v2/en";
const PAGE_SIZE = 24;

const usePokemonSearch = () => {
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  const search = async (query: string, pageNum = 1) => {
    if (!query.trimStart()) return;

    setLoading(true);
    setError(null);
    if (pageNum === 1) setResults([]);

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
          .select('id, name')
          .or(`ptcgo_code.eq.${userCode},id.eq.${userCode.toLowerCase()}`)
          .limit(1);

        if (!setData || setData.length === 0) {
          setError('Set não encontrado. Tente o nome da carta.');
          setLoading(false);
          return;
        }

        const setId = setData[0].id;
        const setName = setData[0].name;

        const withZeros = `${setId}-${localId}`;
        const withoutZeros = `${setId}-${parseInt(localId)}`;

        const [res1, res2] = await Promise.all([
          fetch(`${BASE_URL}/cards/${withZeros}`),
          fetch(`${BASE_URL}/cards/${withoutZeros}`),
        ]);

        const fetched = await Promise.all([
          res1.ok ? res1.json() : null,
          res2.ok ? res2.json() : null,
        ]);

        const seen = new Set<string>();
        for (const card of fetched) {
          if (card && card.id && !seen.has(card.id)) {
            seen.add(card.id);
            cards.push({
              id: card.id,
              name: card.name,
              localId: card.localId,
              image: card.image ?? '',
              set: {
                id: card.set?.id ?? setId,
                name: card.set?.name ?? setName,
              },
            });
          }
        }

        cards = cards.filter(c => c.image);
        setHasMore(false);
      } else {
        const res = await fetch(
          `${BASE_URL}/cards?name=${encodeURIComponent(trimmed)}&pagination:itemsPerPage=${PAGE_SIZE}&pagination:page=${pageNum}`
        );
        const data = await res.json();
        const raw = Array.isArray(data) ? data : [];
        const mapped = raw
          .filter((card: any) => card.image)
          .map((card: any) => ({
            id: card.id,
            name: card.name,
            localId: card.localId,
            image: card.image ?? '',
            set: {
              id: card.set?.id ?? card.id.split('-')[0],
              name: card.set?.name ?? '',
            },
          }));

        cards = pageNum === 1 ? mapped : [...results, ...mapped];
        setHasMore(raw.length === PAGE_SIZE);
      }

      if (cards.length === 0) {
        setError('Nenhuma carta encontrada.');
      } else {
        setResults(cards);
        setPage(pageNum);
        setCurrentQuery(query);
      }
    } catch {
      setError('Erro ao buscar cartas.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => search(currentQuery, page + 1);

  const clear = () => {
    setResults([]);
    setPage(1);
    setHasMore(false);
    setCurrentQuery('');
  };

  return { results, loading, error, hasMore, search, loadMore, clear };
};

export default usePokemonSearch
