import { useState } from 'react'

interface CardImageProps {
  src: string,
  alt: string,
  className?: string
}

const CardImage = ({ src, alt, className = '' }: CardImageProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full">
      {!loaded && (
        <img
          src="/back-card-art.webp"
          alt="carregando..."
          className={`w-full ${className}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className} ${!loaded ? 'absolute inset-0' : ''}`}
      />
    </div>
  );
};

export default CardImage
