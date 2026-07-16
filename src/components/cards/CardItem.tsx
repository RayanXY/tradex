import CardImage from './CardImage'
import CardBadges from './CardBadges'
import useLongPress from '../../hooks/useLongPress'
import type { TradexCard } from '../../types'
import { getRarityColor } from '../../constants/rarities'

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
  const longPress = useLongPress(() => onOpenModal(card));
  const rarityColor = getRarityColor(card.rarity);

  const handleClick = () => {
    if (selectable && onToggleSelect) onToggleSelect();
  };

  const borderColor = selectable && isSelected
    ? selectColor
    : rarityColor ?? "2a2a2a";

  return (
    <div
      onClick={handleClick}
      style={{ borderColor: selectable && isSelected ? selectColor : (rarityColor ?? '#2a2a2a') }}
      className={`bg-[#1a1a1a] border-2 rounded-xl p-3 flex flex-col gap-2 transition-colors ${selectable ? 'cursor-pointer' : ''}`}
    >
      <div className="relative" {...longPress}>
        <CardImage src={card.image_url} alt={card.name} className="rounded-lg" />

        {/* Info */}
        <button
          onClick={e => { e.stopPropagation(); onOpenModal(card); }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#444] text-[#888] text-[10px] flex items-center justify-center hover:text-[#f0f0f0] hover:border-[#666] cursor-pointer z-10"
        >
          ⓘ
        </button>

        {/* Check Icon */}
        {selectable && isSelected && (
          <div
            style={{ backgroundColor: selectColor }}
            className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center z-10"
          >
            <span className="text-white text-xs font-bold">✓</span>
          </div>
        )}

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
            onClick={e => { e.stopPropagation(); onOpenModal(card); }}
            className="text-xs text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
};

export default CardItem
