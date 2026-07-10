import { useState, useEffect } from 'react'

export interface CardDetails {
  rarity?: string,
  category?: string,
  hp?: number,
  types?: string[],
  stage?: string,
  evolveFrom?: string,
  description?: string,
  illustrator?: string,
  retreat?: number,
  attacks?: {
    name: string,
    cost?: string[],
    damage?: string | number,
    effect?: string,
  }[],
  abilities?: {
    name: string,
    type?: string,
    effect?: string,
  }[],
  weaknesses?: {
    type: string,
    value: string,
  }[],
  set?: {
    id: string,
    name: string,
    symbol?: string,
    logo?: string,
  },
}

const BASE_URL = "https://api.tcgdex.net/v2/en";

const useCardDetails = (tcgCardId: string | null) => {
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tcgCardId) {
      setDetails(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDetails(null);

    fetch(`${BASE_URL}/cards/${tcgCardId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tcgCardId]);

  return { details, loading };
}

export default useCardDetails
