import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import CardItem from '../components/cards/CardItem'
import CardModal from '../components/cards/CardModal'
import Tabs from '../components/ui/Tabs'
import { useShowcaseCards } from '../hooks/useShowcaseCards'
import type { TradexCard, Seller } from '../types'
import Pagination from '../components/ui/Pagination'
import SetLogo from '../components/ui/SetLogo'
import useSets from '../hooks/useSets'

type ViewMode = 'grade' | 'sets';

const Wishlist = () => {
const { sets } = useSets();

  const [gradePage, setGradePage] = useState(1);
  const [modalIndex, setModalIndex] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [gradeSearch, setGradeSearch] = useState('');
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grade');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openSets, setOpenSets] = useState<Set<string>>(new Set());

  const openModal = (card: TradexCard) => {
    setModalIndex(cards.findIndex(c => c.id === card.id));
    setModalOpen(true);
  }
  
  const { phone } = useParams<{ phone: string }>();
  const { cards, groups, loading: loadingCards } = useShowcaseCards(seller?.id ?? null, 'want');

  useEffect(() => {
    const loadSeller = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, phone, slug')
        .eq('slug', phone)
        .single();

      if (!userData) {
        setNotFound(true);
        setLoadingSeller(false);
        return;
      }

      setSeller(userData);
      setLoadingSeller(false);
    };

    loadSeller();
  }, [phone]);

  useEffect(() => {
    if (groups.length > 0) {
      setOpenSets(new Set([groups[0].setId]));
    }
  }, [groups]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const handleContact = () => {
    if (!seller || selected.size === 0) return;

    const selectedCards = cards.filter(c => selected.has(c.id));
    const list = selectedCards
      .map(c => `• ${c.name_pt ?? c.name} (${c.set_name})`)
      .join('\n');

    const message = `Olá ${seller.name}! Tenho as seguintes cartas que você procura:\n\n${list}`;
    const url = `https://wa.me/55${seller.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  const loading = loadingSeller || loadingCards;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-[#555] text-sm">Carregando...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-[#555] text-sm">Usuário não encontrado.</p>
      </div>
    );
  }

  const renderCards = (cardList: TradexCard[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {cardList.map(card => (
        <CardItem
          key={card.id}
          card={card}
          onOpenModal={openModal}
          selectable
          isSelected={selected.has(card.id)}
          onToggleSelect={() => toggleSelect(card.id)}
          selectColor="#3b82f6"
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8 pb-28">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">{seller?.name}</h1>
          <p className="text-sm text-[#888] mt-1">
            {cards.length} {cards.length === 1 ? 'carta procurada' : 'cartas procuradas'}
          </p>
          <Link
            to={`/u/${phone}`}
            className="inline-block mt-3 text-sm text-[#f4d03f] hover:underline"
          >
            Ver cartas à venda →
          </Link>
        </div>

        {cards.length === 0 ? (
          <p className="text-sm text-[#555]">Nenhuma carta na lista de busca.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#555]">Selecione as cartas que você tem e clique em "Oferecer".</p>
              <Tabs
                tabs={[
                  { id: 'grade', label: 'Grade' },
                  { id: 'sets', label: 'Por set' },
                ]}
                active={viewMode}
                onChange={id => {
                  setViewMode(id as ViewMode);
                  setGradePage(1);
                  setGradeSearch('');
                }}
              />
            </div>

            {viewMode === 'grade' && (
              <>
                <input
                  type="text"
                  placeholder="Buscar por nome ou set..."
                  value={gradeSearch}
                  onChange={e => { setGradeSearch(e.target.value); setGradePage(1); }}
                  className="w-full mb-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
                {(() => {
                  const isSearching = gradeSearch.trim().length > 0;
                  const filtered = isSearching
                    ? cards.filter(c =>
                        c.name.toLowerCase().includes(gradeSearch.toLowerCase()) ||
                        c.set_name.toLowerCase().includes(gradeSearch.toLowerCase())
                      )
                    : cards;
                  const totalPages = Math.ceil(filtered.length / 20);
                  const paginated = isSearching ? filtered : filtered.slice((gradePage - 1) * 20, gradePage * 20);
                  return (
                    <>
                      {paginated.length === 0
                        ? <p className="text-sm text-[#555]">Nenhuma carta encontrada.</p>
                        : renderCards(paginated)
                      }
                      {!isSearching && totalPages > 1 && (
                        <Pagination current={gradePage} total={totalPages} onChange={setGradePage} />
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {viewMode === 'sets' && (
              <div className="flex flex-col gap-2">
                {groups.map((group) => {
                  const isOpen = openSets.has(group.setId);
                  return (
                    <div key={group.setId} className="border border-[#222] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenSets(prev => {
                          const next = new Set(prev);
                          next.has(group.setId) ? next.delete(group.setId) : next.add(group.setId);
                          return next;
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <SetLogo logoUrl={group.logoUrl} name={group.setName} />
                          <span className="text-sm font-semibold text-[#f0f0f0]">{group.setName}</span>
                          <span className="text-xs text-[#555]">
                            {group.cards.length} {group.cards.length === 1 ? 'carta' : 'cartas'}
                          </span>
                        </div>
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5"
                          className={`text-[#555] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="p-4">
                          {renderCards(group.cards)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6">
          <button
            onClick={handleContact}
            className="bg-[#25d366] hover:bg-[#1dba57] text-white font-semibold rounded-xl px-8 py-4 shadow-lg transition-colors flex items-center gap-3 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Oferecer ({selected.size} {selected.size === 1 ? 'carta' : 'cartas'})
          </button>
        </div>
      )}

      {modalOpen && (
        <CardModal
          cards={cards}
          currentIndex={modalIndex}
          onIndexChange={setModalIndex}
          onClose={() => setModalOpen(false)}
          sets={sets}
        />
      )}
    </div>
  )
}

export default Wishlist
