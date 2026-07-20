import { useEffect, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import type { TradexCard } from '../../types'
import useCardDetails from '../../hooks/useCardDetails'
import { conditionColor, languageCountry } from '../../constants/cards'
import type { PokemonCard } from '../../hooks/usePokemonSearch'

type CardModalCard =
  | TradexCard
  | Pick<PokemonCard, 'id' | 'name' | 'image' | 'set'> & { localId: string };

interface CardModalProps {
  card: CardModalCard | null,
  onClose: () => void
}

const isTradexCard = (card: CardModalCard): card is TradexCard =>
  'tcg_card_id' in card;

const energyColor: Record<string, string> = {
  Fairy: '#ec4899', Dragon: '#b8960c', Colorless: '#d4d4d4',
  Grass: '#7db81f', Fire: '#e3350d', Water: '#3b82f6', Lightning: '#f4d03f',
  Psychic: '#a855f7', Fighting: '#c2410c', Darkness: '#1f2937', Metal: '#94a3b8',
};

const CardModal = ({ card, onClose }: CardModalProps) => {
  const tcgId = card ? (isTradexCard(card) ? card.tcg_card_id : card.id) : null;
  const { details, loading } = useCardDetails(tcgId);
  const [accordionOpen, setAccordionOpen] = useState(false);

  useEffect(() => {
    if (!card) return;
    setAccordionOpen(false);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [card, onClose]);

  if (!card) return null;

  const isTradex = isTradexCard(card);
  const imageUrl = isTradex
    ? card.image_url.replace('/low.webp', '/high.webp')
    : card.image + '/high.webp';
  const setName = isTradex ? card.set_name : card.set.name;
  const localId = isTradex ? null : (card as any).localId;
  const c = isTradex ? (conditionColor[card.condition] ?? conditionColor['NM']) : null;

  const hasDetails = !loading && !!details;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4 my-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* 1. Nome */}
        <div className="pr-8">
          <p className="font-bold text-[#f0f0f0] text-xl leading-tight">
            {card.name}
            {localId && <span className="text-[#555] font-normal text-base ml-2">#{localId}</span>}
          </p>
          <p className="text-sm text-[#888]">{setName}</p>
        </div>

        {/* 2. Imagem */}
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt={card.name}
            className="w-64 rounded-xl shadow-lg"
          />
        </div>

        {/* 3. Logo do set */}
        {details?.set?.logo && (
          <div className="flex justify-center">
            <img src={`${details.set.logo}.webp`} alt={details.set.name} className="h-8 object-contain opacity-80" />
          </div>
        )}

        {/* 4. Accordion de detalhes */}
        <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
          <button
            onClick={() => setAccordionOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#888] hover:text-[#f0f0f0] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            <span>Detalhes da carta</span>
            {loading ? (
              <span className="text-xs text-[#555]">Carregando...</span>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${accordionOpen ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            )}
          </button>

          {accordionOpen && (
            <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#2a2a2a] pt-3">
              {!hasDetails ? (
                <p className="text-sm text-[#555]">Detalhes indisponíveis.</p>
              ) : (
                <>
                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {details.rarity && (
                      <span className="bg-[#2a2a2a] text-[#f0f0f0] px-2 py-1 rounded">{details.rarity}</span>
                    )}
                    {details.hp && (
                      <span className="bg-[#2a2a2a] text-[#f0f0f0] px-2 py-1 rounded">{details.hp} HP</span>
                    )}
                    {details.types?.map(t => (
                      <span key={t} style={{ backgroundColor: energyColor[t] ?? '#2a2a2a' }} className="text-white px-2 py-1 rounded">
                        {t}
                      </span>
                    ))}
                    {details.stage && (
                      <span className="bg-[#2a2a2a] text-[#888] px-2 py-1 rounded">{details.stage}</span>
                    )}
                  </div>

                  {/* Ataques */}
                  {details.attacks && details.attacks.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {details.attacks.map((atk, i) => (
                        <div key={i} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {atk.cost?.map((cost, ci) => (
                                  <span key={ci} style={{ backgroundColor: energyColor[cost] ?? '#888' }} className="w-4 h-4 rounded-full" />
                                ))}
                              </div>
                              <span className="text-sm font-semibold text-[#f0f0f0]">{atk.name}</span>
                            </div>
                            {atk.damage && <span className="text-sm font-bold text-[#f0f0f0]">{atk.damage}</span>}
                          </div>
                          {atk.effect && <p className="text-xs text-[#888] mt-1">{atk.effect}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Habilidades */}
                  {details.abilities && details.abilities.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {details.abilities.map((ab, i) => (
                        <div key={i} className="bg-[#0f0f0f] border border-[#f4d03f]/30 rounded-lg p-3">
                          <span className="text-xs font-bold text-[#f4d03f] uppercase">{ab.type ?? 'Habilidade'}</span>
                          <p className="text-sm font-semibold text-[#f0f0f0]">{ab.name}</p>
                          {ab.effect && <p className="text-xs text-[#888] mt-1">{ab.effect}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fraquezas / Resistências / Recuo */}
                  <div className="flex flex-wrap gap-4 text-xs text-[#888]">
                    {details.weaknesses && details.weaknesses.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span>Fraqueza:</span>
                        {details.weaknesses.map((w, i) => (
                          <span key={i} style={{ color: energyColor[w.type] }}>{w.type} {w.value}</span>
                        ))}
                      </div>
                    )}
                    {details.resistances && details.resistances.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span>Resistência:</span>
                        {details.resistances.map((r, i) => (
                          <span key={i} style={{ color: energyColor[r.type] }}>{r.type} {r.value}</span>
                        ))}
                      </div>
                    )}
                    {details.retreat !== undefined && (
                      <span>Recuo: {details.retreat}</span>
                    )}
                  </div>

                  {details.illustrator && (
                    <p className="text-xs text-[#555]">Ilustração: {details.illustrator}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 5. Negociação — só no modo TradexCard */}
        {isTradex && c && (
          <div className="pt-3 border-t border-[#2a2a2a] flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${card.type === 'sell' ? 'bg-[#e3350d]/20 text-[#e3350d]' : 'bg-[#3b82f6]/20 text-[#3b82f6]'}`}>
                {card.type === 'sell' ? 'Vendo' : 'Procuro'}
              </span>
              <div style={{ backgroundColor: c.bg, color: c.text }} className="text-xs font-bold px-2 py-1 rounded">
                {card.condition === 'ANY' ? '?' : card.condition}
              </div>
              {card.language && (
                <div className="w-5 h-4 border border-[#0f0f0f] overflow-hidden flex items-center justify-center bg-black">
                  <ReactCountryFlag countryCode={languageCountry[card.language] ?? 'BR'} svg style={{ width: '2em', height: '2em' }} />
                </div>
              )}
              <div className="bg-white border-2 border-black text-black text-xs font-bold px-1.5 py-0.5 rounded">
                x{card.quantity}
              </div>
            </div>
            {card.price != null
              ? <p className="text-xl font-bold text-[#f4d03f]">R$ {card.price.toFixed(2)}</p>
              : <p className="text-sm text-[#555]">Valor a negociar</p>
            }
          </div>
        )}
      </div>
    </div>
  )
}

export default CardModal
