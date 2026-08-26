import { useState, useEffect } from 'react'
import { tcgdexFetch } from '../lib/tcgdex'

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
  resistances?: {
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

    Promise.all([
      tcgdexFetch(`v2/en/cards/${tcgCardId}`).then(res => res.ok ? res.json() : null).catch(() => null),
      tcgdexFetch(`v2/pt/cards/${tcgCardId}`).then(res => res.ok ? res.json() : null).catch(() => null),
    ]).then(([en, pt]) => {
      if (cancelled) return;
      if (!en) { setDetails(null); setLoading(false); return; }
      const merged: CardDetails = {
        ...en,
        attacks: pt?.attacks ?? en.attacks,
        abilities: pt?.abilities ?? en.abilities,
      };
      setDetails(merged);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tcgCardId]);

  return { details, loading };
}

export default useCardDetails
