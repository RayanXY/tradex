import { useState } from 'react';

interface SetLogoProps {
  logoUrl: string | null;
  name: string;
  className?: string;
}

const SetLogo = ({ logoUrl, name, className = 'h-10 w-28' }: SetLogoProps) => {
  const [loaded, setLoaded] = useState(false);

  if (!logoUrl) {
    return <div className="h-10 w-28 bg-[#2a2a2a] rounded" />
  }

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-[#2a2a2a] rounded animate-pulse" />
      )}
      <img
        key={logoUrl}
        src={logoUrl}
        alt={name}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

export default SetLogo
