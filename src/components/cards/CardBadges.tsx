import ReactCountryFlag from 'react-country-flag'
import { conditionColor, languageCountry } from '../../constants/cards'

interface CardBadgesProps {
  condition: string,
  language: string,
  quantity: number
}

const CardBadges = ({ condition, language, quantity }: CardBadgesProps) => {
  const c = conditionColor[condition] ?? conditionColor['NM'];

  return (
    <>
      {/* Condition */}
      <div
        style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
        className="absolute -top-2 -left-2 border-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
      >
        {condition === 'ANY' ? '?' : condition}
      </div>

      {/* Language */}
      {language && (
        <div className="absolute -bottom-2 -left-2 w-5 h-4 border border-[#0f0f0f] overflow-hidden flex items-center justify-center bg-black">
          <ReactCountryFlag
            countryCode={languageCountry[language] ?? 'BR'}
            svg
            style={{ width: '2em', height: '2em' }}
          />
        </div>
      )}

      {/* Quantity */}
      <div className="absolute -bottom-2 -right-2 bg-white border-2 border-black text-black text-[11px] font-bold px-1.5 py-0.5 rounded">
        x{quantity}
      </div>
    </>
  );
};

export default CardBadges
