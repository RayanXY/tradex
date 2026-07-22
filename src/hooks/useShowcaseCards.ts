import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TradexCard, SetItem } from '../types';

interface SetGroup {
  setId: string;
  setName: string;
  logoUrl: string | null;
  cards: TradexCard[];
}

interface UseShowcaseCardsResult {
  cards: TradexCard[];
  groups: SetGroup[];
  loading: boolean;
}

const extractSetId = (tcgCardId: string) => {
  const parts = tcgCardId.split('-');
  if (/^\d+$/.test(parts[parts.length - 1])) {
    return parts.slice(0, -1).join('-');
  }
  return tcgCardId;
};

export const useShowcaseCards = (
  userId: string | null,
  type: 'sell' | 'want'
): UseShowcaseCardsResult => {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<TradexCard[]>([]);
  const [groups, setGroups] = useState<SetGroup[]>([]);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);

      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .eq('type', type)
        .order('set_name', { ascending: true });

      const allCards: TradexCard[] = cardsData ?? [];
      setCards(allCards);

      const setIds = [...new Set(allCards.map(c => extractSetId(c.tcg_card_id)))];

      const { data: setsData } = await supabase
        .from('sets')
        .select('id, name, logo_url')
        .in('id', setIds);

      const setsMap = new Map<string, Pick<SetItem, 'name' | 'logo_url'>>(
        (setsData ?? []).map(s => [s.id, s])
      );

      const groupMap = new Map<string, SetGroup>();
      for (const card of allCards) {
        const setId = extractSetId(card.tcg_card_id);
        if (!groupMap.has(setId)) {
          const setInfo = setsMap.get(setId);
          groupMap.set(setId, {
            setId,
            setName: setInfo?.name ?? card.set_name,
            logoUrl: setInfo?.logo_url ?? null,
            cards: [],
          });
        }
        groupMap.get(setId)!.cards.push(card);
      }

      setGroups([...groupMap.values()]);
      setLoading(false);
    };

    load();
  }, [userId, type]);

  return { cards, groups, loading };
}
