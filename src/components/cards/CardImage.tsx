import { useState, useEffect, useRef } from 'react'

interface CardImageProps {
  src: string,
  alt: string,
  className?: string
}

const CardImage = ({ src, alt, className = '' }: CardImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [src])

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
        ref={imgRef}
        key={src}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className} ${!loaded ? 'absolute inset-0' : ''}`}
      />
    </div>
  );
};

export default CardImage
