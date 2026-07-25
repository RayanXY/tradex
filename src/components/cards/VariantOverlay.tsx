import './CardItem.css';
import type { CardVariant } from '../../constants/variants';

const TYPE_COLORS: Record<string, string> = {
  grass:     '#7AC74C',
  fire:      '#EE8130',
  water:     '#6390F0',
  lightning: '#FAB536',
  psychic:   '#F95587',
  fighting:  '#C22E28',
  darkness:  '#705746',
  metal:     '#B7B7CE',
  dragon:    '#C6A114',
  colorless: '#A8A77A',
};

const ENERGY_ICONS = [
  { top: '3%',  left: '20%', size: 14, delay: '0.5s', duration: '3.5s', opacity: 0.85 },
  { top: '2%',  left: '70%', size: 14, delay: '0s',   duration: '3.5s', opacity: 0.85 },
  { top: '30%', left: '1%',  size: 12, delay: '1.2s', duration: '4s',   opacity: 0.75 },
  { top: '55%', left: '2%',  size: 16, delay: '0.6s', duration: '3.2s', opacity: 0.85 },
  { top: '10%', left: '93%', size: 12, delay: '0.8s', duration: '3.8s', opacity: 0.75 },
  { top: '38%', left: '91%', size: 16, delay: '2s',   duration: '4.2s', opacity: 0.85 },
  { top: '58%', left: '95%', size: 14, delay: '1.5s', duration: '3.5s', opacity: 0.75 },
  { top: '76%', left: '5%',  size: 12, delay: '1s',   duration: '4s',   opacity: 0.65 },
  { top: '82%', left: '20%', size: 10, delay: '2.2s', duration: '3.5s', opacity: 0.6  },
  { top: '76%', left: '38%', size: 14, delay: '0.4s', duration: '3.8s', opacity: 0.65 },
  { top: '88%', left: '55%', size: 10, delay: '1.7s', duration: '4.2s', opacity: 0.55 },
  { top: '80%', left: '70%', size: 12, delay: '0.9s', duration: '3.6s', opacity: 0.65 },
  { top: '76%', left: '85%', size: 10, delay: '2.5s', duration: '3.2s', opacity: 0.6  },
];

interface Props {
  variant: string;
  types?: string[] | null;
}

const VariantOverlay = ({ variant, types }: Props) => {
  if (!variant || variant === 'normal') return null;

  if (variant === 'energy_pattern') {
    const typeName = types?.[0]?.toLowerCase() ?? 'colorless';
    const color = TYPE_COLORS[typeName] ?? '#d4d4d4';
    const hasIcon = typeName !== 'fairy';
    const iconSrc = `/energy/${typeName}-energy.png`;

    return (
      <>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '0.75rem',
          pointerEvents: 'none',
          opacity: 0.8,
          mixBlendMode: 'overlay',
          background: `linear-gradient(115deg, transparent 15%, ${color} 50%, transparent 85%)`,
          backgroundSize: '200% 200%',
          animation: 'holo-shift 8s ease infinite',
          zIndex: 0,
        }} />

        {hasIcon && ENERGY_ICONS.map((icon, i) => (
          <img
            key={i}
            src={iconSrc}
            alt=""
            style={{
              position: 'absolute',
              top: icon.top,
              left: icon.left,
              width: icon.size,
              height: icon.size,
              opacity: icon.opacity,
              animation: `energy-float ${icon.duration} ${icon.delay} ease-in-out infinite`,
              filter: `drop-shadow(0 0 3px ${color})`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        ))}
      </>
    );
  }

  if (variant === 'pokeball' || variant === 'masterball') {
    const iconSrc = `/variants/${variant}-light.svg`;
    const color = variant === 'masterball' ? '#a855f7' : '#e3350d';

    const icons = [];
    const cols = 4;
    const rows = 6;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offset = row % 2 === 0 ? 0 : 12.5;
        icons.push({
          top: `${row * 17 - 2}%`,
          left: `${col * 25 + offset - 5}%`,
        });
      }
    }

    return (
      <>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '0.75rem',
          pointerEvents: 'none',
          opacity: variant === 'masterball' ? 0.6 : 0.5,
          mixBlendMode: 'overlay',
          background: `linear-gradient(115deg, transparent 15%, ${color} 50%, transparent 85%)`,
          backgroundSize: '200% 200%',
          animation: 'holo-shift 8s ease infinite',
          zIndex: 0,
        }} />

        {icons.map((icon, i) => (
          <img
            key={i}
            src={iconSrc}
            alt=""
            style={{
              position: 'absolute',
              top: icon.top,
              left: icon.left,
              width: 18,
              height: 18,
              opacity: variant === 'masterball' ? 0.18 : 0.14,
              transform: 'rotate(45deg)',
              filter: `drop-shadow(0 0 2px ${color})`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        ))}
      </>
    );
  }

  return <div className={`variant-overlay variant-${variant as CardVariant}`} />;
}

export default VariantOverlay
