import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import CardModal from '../components/CardModal'
import CardImage from '../components/CardImage'
import useLongPress from '../hooks/useLongPress'
import { useAuth } from '../contexts/AuthContext'
import type { CardModalData } from '../components/CardModal'
import { conditionColor, languageCountry } from '../constants/cards'

interface DashboardCard {
  id: string,
  tcg_card_id: string,
  name: string,
  set_name: string,
  image_url: string,
  price: number | null,
  quantity: number,
  active: boolean,
  type: 'sell' | 'want',
  condition: string,
  language: string
}

const CARDS_PER_PAGE = 12;

const Dashboard = () => {
  const { user } = useAuth();

  const [sellPage, setSellPage] = useState(1);
  const [wantPage, setWantPage] = useState(1);
  const [sellTotal, setSellTotal] = useState(0);
  const [wantTotal, setWantTotal] = useState(0);
  const [selling, setSelling] = useState<DashboardCard[]>([]);
  const [wanting, setWanting] = useState<DashboardCard[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);

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

  const Pagination = ({ page, totalPages, setPage }: { page: number, totalPages: number, setPage: (p: number) => void }) => (
    totalPages > 1 ? (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded-lg text-sm border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] hover:border-[#444] disabled:opacity-30 transition-colors cursor-pointer"
        >
          ← Anterior
        </button>
        <span className="text-sm text-[#555]">{page} / {totalPages}</span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-lg text-sm border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] hover:border-[#444] disabled:opacity-30 transition-colors cursor-pointer"
        >
          Próxima →
        </button>
      </div>
    ) : null
  );

  const CardGrid = ({ cards, type }: { cards: DashboardCard[], type: 'sell' | 'want' }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {cards.map(card => {
        const c = conditionColor[card.condition] ?? conditionColor['NM'];
        const longPress = useLongPress(() => setModalCard({
          name: card.name,
          set_name: card.set_name,
          image_url: card.image_url,
          price: card.price,
          quantity: card.quantity,
          condition: card.condition,
          language: card.language,
          type,
        }));
        return (
          <div
            key={card.id}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="relative" {...longPress}>
              <button
                onClick={e => { e.stopPropagation(); setModalCard({ name: card.name, set_name: card.set_name, image_url: card.image_url, price: card.price, quantity: card.quantity, condition: card.condition, language: card.language, type }); }}
                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center hover:bg-black cursor-pointer"
              >
                ⓘ
              </button>
              <CardImage src={card.image_url} alt={card.name} className="rounded-lg" />
              <div
                style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                className="absolute -top-2 -left-2 border-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
              >
                {card.condition === 'ANY' ? '?' : card.condition}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white border-2 border-black text-black text-[11px] font-bold px-1.5 py-0.5 rounded">
                x{card.quantity}
              </div>
              {card.language && (
                <div className="absolute -bottom-2 -left-2 w-5 h-4 border border-[#0f0f0f] overflow-hidden flex items-center justify-center bg-black">
                  <ReactCountryFlag
                    countryCode={languageCountry[card.language] ?? 'BR'}
                    svg
                    style={{ width: '2em', height: '2em' }}
                  />
                </div>
              )}
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
              <button
                onClick={() => handleRemove(card.id, type)}
                className="text-xs text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
              >
                Remover
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

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
              <CardGrid cards={selling} type="sell" />
              <Pagination page={sellPage} totalPages={sellTotalPages} setPage={setSellPage} />
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
              <CardGrid cards={wanting} type="want" />
              <Pagination page={wantPage} totalPages={wantTotalPages} setPage={setWantPage} />
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard
