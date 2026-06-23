import { useState } from "react"

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

const BASE_URL = "https://api.tcgdex.net/v2/en"

const usePokemonSearch = () => {
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    const setNumberPattern = /^([a-zA-Z0-9]+)[\s-](\d+)$/
    const match = query.trim().match(setNumberPattern)

    try {
      let cards: PokemonCard[] = []

      if (match) {
        const setId = match[1].toLowerCase();
        const localId = match[2];

        const res = await fetch(`${BASE_URL}/cards?localId=${localId}&set.id=${setId}`);
        const data = await res.json();
        cards = Array.isArray(data) ? data : [];
      } else {
        const res = await fetch(`${BASE_URL}/cards?name=${encodeURIComponent(query.trim())}&pagination:itemsPerPage=50`);
        const data = await res.json();
        cards = Array.isArray(data) ? data : [];
      }

      const normalized = cards.map(card => ({
        id: card.id,
        name: card.name,
        localId: card.localId,
        image: card.image ?? '',
        set: card.set ?? { id: card.id.split('-')[0], name: '' },
      }));

      if (normalized.length === 0) {
        setError('Nenhuma carta encontrada.');
      } else {
        setResults(normalized);
      }
    } catch {
      setError("Erro ao buscar cartas.");
    } finally {
      setLoading(false);
    }
  }

  const clear = () => setResults([]);

  return { results, loading, error, search, clear }
}

export default usePokemonSearch
