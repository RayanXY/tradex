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

    try {
      let merged: PokemonCard[] = []

      if (match) {
        const code = match[1].toUpperCase()
        const number = parseInt(match[2])

        // Primeiro busca o set pelo ptcgoCode
        const setRes = await fetch(`${BASE_URL}/sets?q=ptcgoCode:${code}`)
        const setData = await setRes.json()
        const setId = setData.data?.[0]?.id

        if (!setId) {
          setError('Nenhuma carta encontrada.')
          setLoading(false)
          return
        }

        const res = await fetch(`${BASE_URL}/cards?q=${encodeURIComponent(`set.id:${setId} number:${number}`)}&pageSize=20`)
        const data = await res.json()
        merged = data.data ?? []
      } else {
        const res = await fetch(`${BASE_URL}/cards?q=${encodeURIComponent(`name:"${query.trim()}"`)}&pageSize=20&orderBy=-set.releaseDate`)
        const data = await res.json()
        merged = data.data ?? []
      }

      if (merged.length === 0) {
        setError('Nenhuma carta encontrada.')
      } else {
        setResults(merged)
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
