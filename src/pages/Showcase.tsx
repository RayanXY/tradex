import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import CardItem from '../components/cards/CardItem'
import Pagination from '../components/ui/Pagination'
import CardModal from '../components/cards/CardModal'
import type { TradexCard, Seller } from '../types'

const CARDS_PER_PAGE = 12;

const Showcase = () => {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { phone } = useParams<{ phone: string }>();
  const [selling, setSelling] = useState<TradexCard[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalCard, setModalCard] = useState<TradexCard | null>(null);

  useEffect(() => {
    const loadSeller = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, phone, slug')
        .eq('slug', phone)
        .single();

      if (!userData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setSeller(userData);

      const { count } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .eq('active', true)
        .eq('type', 'sell');

      setTotal(count ?? 0);
      setLoading(false);
    }

    loadSeller();
  }, [phone]);

  useEffect(() => {
    if (!seller) return;

    const loadCards = async () => {
      const from = (page - 1) * CARDS_PER_PAGE;
      const to = from + CARDS_PER_PAGE - 1;

      const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', seller.id)
        .eq('active', true)
        .eq('type', 'sell')
        .range(from, to);

      setSelling(data ?? []);
    }

    loadCards();
  }, [seller, page]);

  const totalPages = Math.ceil(total / CARDS_PER_PAGE);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const handleContact = () => {
    if (!seller || selected.size === 0) return;

    const selectedCards = selling.filter(c => selected.has(c.id));
    const list = selectedCards
      .map(c => `• ${c.name} (${c.set_name})`)
      .join('\n');

    const message = `Olá ${seller.name}! Tenho interesse nas seguintes cartas:\n\n${list}`;
    const url = `https://wa.me/55${seller.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-[#555] text-sm">Carregando...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-[#555] text-sm">Vendedor não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8 pb-28">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">{seller?.name}</h1>
          <p className="text-sm text-[#888] mt-1">
            {total} {total === 1 ? 'carta à venda' : 'cartas à venda'}
          </p>
          <Link
            to={`/u/${phone}/procuro`}
            className="inline-block mt-3 text-sm text-[#3b82f6] hover:underline"
          >
            Ver lista de busca →
          </Link>
        </div>

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Vendo</h2>
          {selling.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta à venda no momento.</p>
          ) : (
            <>
              <p className="text-xs text-[#555] mb-4">Selecione as cartas de interesse e clique em "Contatar".</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {selling.map(card => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onOpenModal={setModalCard}
                    selectable
                    isSelected={selected.has(card.id)}
                    onToggleSelect={() => toggleSelect(card.id)}
                    selectColor="#e3350d"
                  />
                ))}
              </div>
              <Pagination current={page} total={totalPages} onChange={setPage} />
            </>
          )}
        </section>
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
            Contatar ({selected.size} {selected.size === 1 ? 'carta' : 'cartas'})
          </button>
        </div>
      )}

      <CardModal card={modalCard} onClose={() => setModalCard(null)} />
    </div>
  )
}

export default Showcase
