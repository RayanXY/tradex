import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/layout/Navbar'
import Pagination from '../components/ui/Pagination'
import CardItem from '../components/cards/CardItem'
import CardModal from '../components/cards/CardModal'
import type { TradexCard } from '../types'

const CARDS_PER_PAGE = 12;

const Dashboard = () => {
  const { user } = useAuth();

  const [selling, setSelling] = useState<TradexCard[]>([]);
  const [wanting, setWanting] = useState<TradexCard[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [sellPage, setSellPage] = useState(1);
  const [wantPage, setWantPage] = useState(1);
  const [sellTotal, setSellTotal] = useState(0);
  const [wantTotal, setWantTotal] = useState(0);
  const [modalCard, setModalCard] = useState<TradexCard | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      const [{ count: sellCount }, { count: wantCount }] = await Promise.all([
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('active', true).eq('type', 'sell'),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('active', true).eq('type', 'want'),
      ]);
      setSellTotal(sellCount ?? 0);
      setWantTotal(wantCount ?? 0);
      setLoadingDashboard(false);
    };

    loadCounts();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const from = (sellPage - 1) * CARDS_PER_PAGE;
    const to = from + CARDS_PER_PAGE - 1;
    supabase.from('cards').select('*').eq('user_id', user.id).eq('active', true).eq('type', 'sell').range(from, to)
      .then(({ data }) => setSelling(data ?? []));
  }, [user, sellPage]);

  useEffect(() => {
    if (!user) return;
    const from = (wantPage - 1) * CARDS_PER_PAGE;
    const to = from + CARDS_PER_PAGE - 1;
    supabase.from('cards').select('*').eq('user_id', user.id).eq('active', true).eq('type', 'want').range(from, to)
      .then(({ data }) => setWanting(data ?? []));
  }, [user, wantPage]);

  const handleRemove = async (id: string, type: 'sell' | 'want') => {
    await supabase.from('cards').update({ active: false }).eq('id', id);
    if (type === 'sell') {
      setSelling(prev => prev.filter(c => c.id !== id));
      setSellTotal(prev => prev - 1);
    } else {
      setWanting(prev => prev.filter(c => c.id !== id));
      setWantTotal(prev => prev - 1);
    }
  };

  const sellTotalPages = Math.ceil(sellTotal / CARDS_PER_PAGE);
  const wantTotalPages = Math.ceil(wantTotal / CARDS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Meu inventário</h1>
          <Link
            to="/search"
            className="bg-[#e3350d] hover:bg-[#c42d0b] text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            + Adicionar cartas
          </Link>
        </div>

        {/* Selling */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
              Vendo ({sellTotal})
            </h2>
            <Link to={`/u/${user?.slug}`} className="text-xs text-[#f4d03f] hover:underline">
              Ver mostruário →
            </Link>
          </div>
          {loadingDashboard ? (
            <p className="text-sm text-[#555]">Carregando...</p>
          ) : selling.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta adicionada ainda.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {selling.map(card => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onOpenModal={setModalCard}
                    onRemove={() => handleRemove(card.id, 'sell')}
                  />
                ))}
              </div>
              <Pagination current={sellPage} total={sellTotalPages} onChange={setSellPage} />
            </>
          )}
        </section>

        {/* Wanting */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
              Procuro ({wantTotal})
            </h2>
            <Link to={`/u/${user?.slug}/procuro`} className="text-xs text-[#f4d03f] hover:underline">
              Ver lista →
            </Link>
          </div>
          {loadingDashboard ? (
            <p className="text-sm text-[#555]">Carregando...</p>
          ) : wanting.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta na lista ainda.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {wanting.map(card => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onOpenModal={setModalCard}
                    onRemove={() => handleRemove(card.id, 'want')}
                  />
                ))}
              </div>
              <Pagination current={wantPage} total={wantTotalPages} onChange={setWantPage} />
            </>
          )}
        </section>

      </main>

      <CardModal card={modalCard} onClose={() => setModalCard(null)} />
    </div>
  );
};

export default Dashboard
