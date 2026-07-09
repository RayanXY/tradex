import { useEffect } from 'react'
import type { TradexCard } from '../../types'
import ReactCountryFlag from 'react-country-flag'
import { conditionColor, languageCountry } from '../../constants/cards'

interface CardModalProps {
  card: TradexCard | null,
  onClose: () => void
}

const CardModal = ({ card, onClose }: CardModalProps) => {
  useEffect(() => {
    if (!card) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [card, onClose]);

  if (!card) return null;

  const c = conditionColor[card.condition] ?? conditionColor['NM'];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={card.image_url.replace('/low.webp', '/high.webp')}
          alt={card.name}
          className="w-48 rounded-xl shadow-lg"
        />

        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#f0f0f0] text-lg leading-tight">{card.name}</p>
              <p className="text-sm text-[#888]">{card.set_name}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${card.type === 'sell' ? 'bg-[#e3350d]/20 text-[#e3350d]' : 'bg-[#3b82f6]/20 text-[#3b82f6]'}`}>
              {card.type === 'sell' ? 'Vendo' : 'Procuro'}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <div style={{ backgroundColor: c.bg, color: c.text }} className="text-xs font-bold px-2 py-1 rounded">
              {card.condition === 'ANY' ? '?' : card.condition}
            </div>

            <div className="w-5 h-4 border border-[#0f0f0f] overflow-hidden flex items-center justify-center bg-black">
              <ReactCountryFlag countryCode={languageCountry[card.language] ?? 'BR'} svg style={{ width: '2em', height: '2em' }} />
            </div>

            <div className="bg-white border-2 border-black text-black text-xs font-bold px-1.5 py-0.5 rounded">
              x{card.quantity}
            </div>
          </div>

          <div className="mt-2">
            {card.price != null
              ? <p className="text-xl font-bold text-[#f4d03f]">R$ {card.price.toFixed(2)}</p>
              : <p className="text-sm text-[#555]">Valor a negociar</p>
            }
          </div>
        </div>

        <button onClick={onClose} className="w-full mt-2 text-sm text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer border border-[#2a2a2a] rounded-lg py-2">
          Fechar
        </button>
      </div>
    </div>
  );
};

export default CardModal
