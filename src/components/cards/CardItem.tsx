import CardImage from './CardImage'
import CardBadges from './CardBadges'
import type { TradexCard } from '../../types'
//import { getRarityColor } from '../../constants/rarities'

interface CardItemProps {
  card: TradexCard,
  onOpenModal: (card: TradexCard) => void,
  onRemove?: () => void,
  selectable?: boolean,
  isSelected?: boolean,
  onToggleSelect?: () => void,
  selectColor?: string
}

const CardItem = ({
  card,
  onOpenModal,
  onRemove,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  selectColor = '#e3350d',
}: CardItemProps) => {
  //const rarityColor = getRarityColor(card.rarity);

  const handleClick = () => {
    if (selectable && onToggleSelect) onToggleSelect();
    else onOpenModal(card);
  };

  return (
    <div
      onClick={handleClick}
      style={{ borderColor: selectable && isSelected ? selectColor : '#2a2a2a' }}
      className={`bg-[#1a1a1a] border-2 rounded-xl p-3 flex flex-col gap-2 transition-colors cursor-pointer`}
    >
      <div className="relative">
        <CardImage src={card.image_url} alt={card.name} className="rounded-lg" language={card.language} />

        {selectable && isSelected && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
            <div
              style={{ backgroundColor: selectColor }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
            >
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); onOpenModal(card); }}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center cursor-pointer z-10"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        <CardBadges condition={card.condition} language={card.language} quantity={card.quantity} />
      </div>

      <div>
        <p className="text-sm font-semibold text-[#f0f0f0] leading-tight">{card.name}</p>
        <p className="text-xs text-[#888]">{card.set_name}</p>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div>
          {card.price != null
            ? <p className="text-sm font-bold text-[#f4d03f]">R$ {card.price.toFixed(2)}</p>
            : <p className="text-sm text-[#555]">Valor a negociar</p>
          }
        </div>
        {onRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="text-xs text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  )
}

export default CardItem
