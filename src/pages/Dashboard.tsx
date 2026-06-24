import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { SubmitEvent } from 'react'
import usePokemonSearch, { type PokemonCard } from '../hooks/usePokemonSearch'

interface DashboardCard {
  id: string,
  tcg_card_id: string,
  name: string,
  set_name: string,
  image_url: string,
  price: number,
  quantity: number,
  active: boolean,
  type: 'sell' | 'want'
}

interface QueuedCard {
  card: PokemonCard,
  price: string,
  quantity: string,
  type: 'sell' | 'want'
}

const Pokeball = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="#e3350d" strokeWidth="2.5"/>
    <path d="M2 24h44" stroke="#e3350d" strokeWidth="2.5"/>
    <circle cx="24" cy="24" r="6" fill="#0f0f0f" stroke="#e3350d" strokeWidth="2.5"/>
    <circle cx="24" cy="24" r="3" fill="#e3350d"/>
    <path d="M2 24C2 12 12 2 24 2C36 2 46 12 46 24" fill="#e3350d" fillOpacity="0.15"/>
  </svg>
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { results, loading: searching, error, hasMore, search, loadMore, clear } = usePokemonSearch();

  const [query, setQuery] = useState('');
  const [selling, setSelling] = useState<DashboardCard[]>([]);
  const [wanting, setWanting] = useState<DashboardCard[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [queue, setQueue] = useState<QueuedCard[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .then(({ data }) => {
        const all = data ?? [];
        setSelling(all.filter(c => c.type === 'sell'));
        setWanting(all.filter(c => c.type === 'want'));
        setLoadingDashboard(false);
      });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: SubmitEvent) => {
    e.preventDefault();
    search(query);
  };

  const handleSelectCard = (card: PokemonCard) => {
    if (queue.some(q => q.card.id === card.id)) {
      handleQueueRemove(card.id);
      return;
    }
    setQueue(prev => [...prev, { card, price: '', quantity: '1', type: 'sell' }]);
  };

  const handleQueueUpdate = (cardId: string, field: 'price' | 'quantity' | 'type', value: string) => {
    setQueue(prev => prev.map(q =>
      q.card.id === cardId ? { ...q, [field]: value } : q
    ));
  };

  const handleQueueRemove = (cardId: string) => {
    setQueue(prev => prev.filter(q => q.card.id !== cardId));
  };

  const handleAddAll = async () => {
    if (!user || queue.length === 0) return;

    const invalid = queue.some(q => q.type === 'sell' && !q.price);
    if (invalid) return;

    setSaving(true);

    const rows = queue.map(q => ({
      user_id: user.id,
      tcg_card_id: q.card.id,
      name: q.card.name,
      set_name: q.card.set.name,
      image_url: q.card.image ? q.card.image + '/low.webp' : '',
      price: q.price ? parseFloat(q.price) : null,
      quantity: parseInt(q.quantity),
      active: true,
      type: q.type,
    }));

    const { data, error: supabaseError } = await supabase
      .from('cards')
      .insert(rows)
      .select();

    if (!supabaseError && data) {
      const newSell = data.filter(c => c.type === 'sell');
      const newWant = data.filter(c => c.type === 'want');
      setSelling(prev => [...newSell, ...prev]);
      setWanting(prev => [...newWant, ...prev]);
      setQueue([]);
      clear();
      setQuery('');
    }

    setSaving(false);
  };

  const handleRemove = async (id: string, type: 'sell' | 'want') => {
    await supabase.from('cards').update({ active: false }).eq('id', id);
    if (type === 'sell') setSelling(prev => prev.filter(c => c.id !== id));
    else setWanting(prev => prev.filter(c => c.id !== id));
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const CardGrid = ({ cards, type }: { cards: DashboardCard[], type: 'sell' | 'want' }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {cards.slice(0, 3).map(card => (
        <div
          key={card.id}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex flex-col gap-2"
        >
          <img src={card.image_url} alt={card.name} className="w-full rounded-lg" />
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
              {type === 'sell' && <p className="text-xs text-[#888]">Qtd: {card.quantity}</p>}
            </div>
            <button
              onClick={() => handleRemove(card.id, type)}
              className="text-xs text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
            >
              Remover
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">

      <header className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Pokeball />
          <span className="text-lg font-bold tracking-widest uppercase">Tradex</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to={`/u/${user.slug}`}
            className="text-sm text-[#f4d03f] hover:underline"
          >
            Ver mostruário
          </Link>
          <span className="text-sm text-[#888]">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-[#888] hover:text-[#e3350d] transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Search */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Buscar carta</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Nome (ex: Charizard) ou Set+Número (ex: MEW 006)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-3 text-sm transition-colors cursor-pointer"
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
          {error && <p className="text-sm text-[#e3350d] mt-2">{error}</p>}
        </section>

        {/* Search results */}
        {results.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">
              Resultados ({results.length}{hasMore ? '+' : ''})
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {results.map(card => {
                const inQueue = queue.some(q => q.card.id === card.id);
                const inSell = selling.some(c => c.tcg_card_id === card.id);
                const inWant = wanting.some(c => c.tcg_card_id === card.id);
                const inInventory = inSell || inWant;

                return (
                  <button
                    key={card.id}
                    onClick={() => !inInventory && handleSelectCard(card)}
                    disabled={inInventory}
                    className={`group flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1a1a1a] transition-colors ${
                      inInventory
                        ? `${inSell ? 'border border-[#e3350d]' : 'border border-[#3b82f6]'} opacity-40 cursor-not-allowed`
                        : inQueue
                        ? 'border-2 border-[#e3350d] ring-1 ring-[#e3350d]/20 cursor-pointer'
                        : 'border border-[#2a2a2a] hover:border-[#e3350d] cursor-pointer'
                    }`}
                  >
                    <div className="relative w-full">
                      <img src={card.image ? card.image + '/low.webp' : ''} alt={card.name} className="w-full rounded" />
                      {inQueue && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#e3350d] flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-center leading-tight transition-colors group-hover:text-[#f0f0f0] text-[#888]">
                      {inSell ? '● Vendo' : inWant ? '● Procuro' : card.set.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={loadMore}
                  disabled={searching}
                  className="text-sm text-[#888] hover:text-[#f0f0f0] border border-[#2a2a2a] hover:border-[#444] rounded-lg px-5 py-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {searching ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Queue */}
        {queue.length > 0 && (
          <section className="mb-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Cartas selecionadas</h2>
            <div className="flex flex-col gap-2">
              {queue.map(({ card, price, quantity, type }) => (
                <div key={card.id} className="flex items-center gap-3 border-b border-[#2a2a2a] pb-2 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-[#f0f0f0]">{card.name}</span>
                    <span className="text-xs text-[#555] mx-1">·</span>
                    <span className="text-xs text-[#888]">{card.set.id.toUpperCase()}</span>
                    <span className="text-xs text-[#555] mx-1">·</span>
                    <span className="text-xs text-[#888]">#{card.localId}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleQueueUpdate(card.id, 'type', 'sell')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        type === 'sell'
                          ? 'bg-[#e3350d] text-white'
                          : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0]'
                      }`}
                    >
                      Vendo
                    </button>
                    <button
                      onClick={() => handleQueueUpdate(card.id, 'type', 'want')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        type === 'want'
                          ? 'bg-[#3b82f6] text-white'
                          : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0]'
                      }`}
                    >
                      Procuro
                    </button>
                    <input
                      type="number"
                      placeholder={type === 'sell' ? 'R$' : 'Até R$'}
                      value={price}
                      onChange={e => handleQueueUpdate(card.id, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
                    />
                    {type === 'sell' && (
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={quantity}
                        onChange={e => handleQueueUpdate(card.id, 'quantity', e.target.value)}
                        min="1"
                        className="w-14 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
                      />
                    )}
                    <button
                      onClick={() => handleQueueRemove(card.id)}
                      className="text-xs text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddAll}
                disabled={saving || queue.some(q => q.type === 'sell' && !q.price)}
                className="bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors cursor-pointer"
              >
                {saving ? 'Salvando...' : `Adicionar ${queue.length > 1 ? `${queue.length} cartas` : 'carta'}`}
              </button>
              <button
                onClick={() => setQueue([])}
                className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer"
              >
                Limpar seleção
              </button>
            </div>
          </section>
        )}

        {/* Selling */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Vendo</h2>
            {selling.length > 3 && (
              <Link to={`/u/${user.slug}`} className="text-xs text-[#f4d03f] hover:underline">
                Ver todas ({selling.length})
              </Link>
            )}
          </div>
          {loadingDashboard ? (
            <p className="text-sm text-[#555]">Carregando...</p>
          ) : selling.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta adicionada ainda.</p>
          ) : (
            <CardGrid cards={selling} type="sell" />
          )}
        </section>

        {/* Wanting */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Procuro</h2>
            {wanting.length > 3 && (
              <Link to={`/u/${user.slug}/procuro`} className="text-xs text-[#f4d03f] hover:underline">
                Ver todas ({wanting.length})
              </Link>
            )}
          </div>
          {loadingDashboard ? (
            <p className="text-sm text-[#555]">Carregando...</p>
          ) : wanting.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta na lista ainda.</p>
          ) : (
            <CardGrid cards={wanting} type="want" />
          )}
        </section>

      </main>
    </div>
  );
};

export default Dashboard
