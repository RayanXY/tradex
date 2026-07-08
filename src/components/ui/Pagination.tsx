import { useEffect, useState } from 'react'

interface PaginationProps {
  current: number,
  total: number,
  onChange: (page: number) => void,
}

const Pagination = ({ current, total, onChange }: PaginationProps) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (total <= 1) return null;

  const handleChange = (page: number) => {
    onChange(page);
    if (isMobile) window.scrollTo(0, 0);
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => handleChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="px-4 py-2 rounded-lg text-sm border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] hover:border-[#444] disabled:opacity-30 transition-colors cursor-pointer"
      >
        ← Anterior
      </button>
      <span className="text-sm text-[#555]">{current} / {total}</span>
      <button
        onClick={() => handleChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="px-4 py-2 rounded-lg text-sm border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] hover:border-[#444] disabled:opacity-30 transition-colors cursor-pointer"
      >
        Próxima →
      </button>
    </div>
  );
};

export default Pagination
