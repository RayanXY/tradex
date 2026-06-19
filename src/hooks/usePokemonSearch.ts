import { useState } from "react"

export interface PokemonCard {
  id: string,
  name: string,
  set: {
    id: string,
    name: string
  },
  number: string,
  images: {
    small: string,
    large: string
  }
}

const BASE_URL = "https://api.pokemontcg.io/v2"

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

    const q = match
      ? `set.ptcgoCode:${match[1]} number:${parseInt(match[2])}`
      : `name:"${query.trim()}"`

    try {
      const res = await fetch(`${BASE_URL}/cards?q=${encodeURIComponent(q)}&pageSize=20&orderBy=-set.releaseDate`);
      const data = await res.json()

      if (!data.data || data.data.length === 0) {
        setError('Nenhuma carta encontrada.')
        setResults([])
      } else {
        setResults(data.data)
      }
    } catch {
      setError("Erro ao buscar cartas.")
    } finally {
      setLoading(false);
    }
  }

  const clear = () => setResults([]);

  return { results, loading, error, search, clear }
}

export default usePokemonSearch
