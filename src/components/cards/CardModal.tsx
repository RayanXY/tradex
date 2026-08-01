import ReactCountryFlag from 'react-country-flag'
import { useEffect, useState, useRef } from 'react'
import type { TradexCard } from '../../types'
import useCardDetails from '../../hooks/useCardDetails'
import type { PokemonCard } from '../../hooks/usePokemonSearch'
import VariantOverlay from './VariantOverlay'
import { rarityTier, tierLabel } from '../../constants/rarities';
import { conditionColor, languageCountry, getLocalizedImageUrl } from '../../constants/cards'

type CardModalCard =
  | TradexCard
  | Pick<PokemonCard, 'id' | 'name' | 'image' | 'set'> & { localId: string };

interface CardModalProps {
  cards: CardModalCard[],
  currentIndex: number,
  onIndexChange: (index: number) => void,
  onClose: () => void
}

const stageLabel: Record<string, string> = {
  'Basic': 'Básico',
  'Stage 1': 'Estágio 1',
  'Stage 2': 'Estágio 2',
  'LEGEND': 'Lenda',
  'Level-Up': 'Nível Acima',
  'Restored': 'Restaurado',
};

const typeLabel: Record<string, string> = {
  Grass: 'Planta', Fire: 'Fogo', Water: 'Água', Lightning: 'Elétrico',
  Psychic: 'Psíquico', Fighting: 'Lutador', Darkness: 'Sombrio',
  Metal: 'Metal', Dragon: 'Dragão', Fairy: 'Fada', Colorless: 'Incolor',
};

const isTradexCard = (card: CardModalCard): card is TradexCard =>
  'tcg_card_id' in card;

const energyColor: Record<string, string> = {
  Fairy: '#ec4899', Dragon: '#b8960c', Colorless: '#d4d4d4',
  Grass: '#7db81f', Fire: '#e3350d', Water: '#3b82f6', Lightning: '#f4d03f',
  Psychic: '#a855f7', Fighting: '#c2410c', Darkness: '#1f2937', Metal: '#94a3b8',
}

const CardModal = ({ cards, currentIndex, onIndexChange, onClose }: CardModalProps) => {
  const card = cards[currentIndex] ?? null;
  const tcgId = card ? (isTradexCard(card) ? card.tcg_card_id : card.id) : null;
  const { details, loading } = useCardDetails(tcgId);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const goTo = (index: number) => {
    if (index < 0 || index >= cards.length) return;
    onIndexChange(index);
  }

  useEffect(() => {
    if (!card) return;
    setAccordionOpen(false);
    setImgLoaded(false);

    document.body.style.overflow = 'hidden'

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
      if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    }

    document.addEventListener('keydown', handleKey);

    return () =>{
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    }
  }, [card, currentIndex, onClose]);

  if (!card) return null

  const isTradex = isTradexCard(card);
  const rawUrl = isTradex ? card.image_url : card.image + '/low.webp';
  const imageUrl = getLocalizedImageUrl(rawUrl, isTradex ? card.language : 'BR').replace('/low.webp', '/high.webp');
  const setName = isTradex ? card.set_name : card.set.name;
  const localId = isTradex ? null : (card as any).localId;
  const c = isTradex ? (conditionColor[card.condition] ?? conditionColor['NM']) : null;
  const hasDetails = !loading && !!details;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < cards.length - 1;

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) goTo(currentIndex + 1);
    else goTo(currentIndex - 1);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-10 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-sm p-3 flex flex-col gap-2 my-auto touch-action-none"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Variant Overlay */}
        {isTradex && card.variant && card.variant !== 'normal' && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
            <VariantOverlay variant={card.variant} types={(card as TradexCard).types} size='modal' />
          </div>
        )}
        {/* Prev */}
        {hasPrev && (
          <button
            onClick={e => { e.stopPropagation(); goTo(currentIndex - 1); }}
            className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#2a2a2a] flex items-center justify-center text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer shadow-lg z-10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}

        {/* Next */}
        {hasNext && (
          <button
            onClick={e => { e.stopPropagation(); goTo(currentIndex + 1); }}
            className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#2a2a2a] flex items-center justify-center text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer shadow-lg z-10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}

        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer z-20"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* 1. Nome */}
        <div className="relative z-10 px-8 text-center">
          <p className="font-bold text-[#f0f0f0] text-xl leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {isTradex
              ? ((card as TradexCard).name_pt ?? card.name)
              : ((card as any).name_pt ?? card.name)
            }
            {localId && <span className="text-[#555] font-normal text-base ml-2">#{localId}</span>}
          </p>
          <p className="text-sm text-[#a3a3a3]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{setName}</p>
        </div>

        {/* 2. Imagem com placeholder */}
        <div className="flex justify-center">
          <div className="relative w-80">
            {!imgLoaded && (
              <img
                src="/back-card-art.webp"
                alt="carregando..."
                className="w-full rounded-xl"
              />
            )}
            <img
              key={imageUrl}
              src={imageUrl}
              alt={card.name}
              onLoad={() => setImgLoaded(true)}
              className={`w-full rounded-xl shadow-lg transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            />
          </div>
        </div>

        {/* Contador */}
        {cards.length > 1 && (
          <div className="relative z-10">
            <p className="text-center text-xs text-[#a3a3a3]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {currentIndex + 1} / {cards.length}
            </p>
          </div>
        )}

        {/* 3. Logo do set */}
        <div className="flex justify-center h-8">
          {details?.set?.logo
            ? <img src={`${details.set.logo}.webp`} alt={details.set.name} className="h-8 object-contain opacity-80" />
            : <div className="h-8 w-32 rounded bg-[#2a2a2a] animate-pulse" />
          }
        </div>

        {/* 4. Accordion de detalhes */}
        <div className="relative z-10 border border-[#2a2a2a] rounded-xl overflow-hidden bg-[#1a1a1a]/90">
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
                    {details.rarity && (() => {
                      const tier = rarityTier[details.rarity];
                      const label = tier ? tierLabel[tier] : details.rarity;
                      return (
                        <span className="bg-[#2a2a2a] text-[#f0f0f0] px-2 py-1 rounded">{label}</span>
                      );
                    })()}
                    {details.hp && (
                      <span className="bg-[#2a2a2a] text-[#f0f0f0] px-2 py-1 rounded">{details.hp} HP</span>
                    )}
                    {details.types?.map(t => (
                      <span key={t} style={{ backgroundColor: energyColor[t] ?? '#2a2a2a' }} className="text-white px-2 py-1 rounded">
                        {typeLabel[t] ?? t}
                      </span>
                    ))}
                    {details.stage && (
                      <span className="bg-[#2a2a2a] text-[#888] px-2 py-1 rounded">{stageLabel[details.stage] ?? details.stage}</span>
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

        {/* 5. Negociação */}
        {isTradex && c && (
          <div className="relative z-10 pt-2 border-t border-[#2a2a2a] flex flex-col gap-2 bg-[#1a1a1a]/70 rounded-xl px-2 -mx-1 pb-1">
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
              : <p className="text-sm text-[#a3a3a3]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Valor a negociar</p>
            }
          </div>
        )}
      </div>
    </div>
  )
}

export default CardModal
