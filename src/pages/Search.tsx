import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import usePokemonSearch, { type PokemonCard } from '../hooks/usePokemonSearch'
import CardImage from '../components/CardImage'
import Navbar from '../components/Navbar'

interface DashboardCard {
  id: string,
  tcg_card_id: string,
  type: 'sell' | 'want',
}

interface QueuedCard {
  card: PokemonCard,
  price: string,
  quantity: string,
  type: 'sell' | 'want',
  condition: string
}

interface SetItem {
  id: string,
  name: string,
  serie: string,
  release_date: string | null
}

const Search = () => {
  const { user } = useAuth();
  const { results, loading: searching, error, hasMore, search, loadMore, clear } = usePokemonSearch();

  const [query, setQuery] = useState('');
  const [queue, setQueue] = useState<QueuedCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<DashboardCard[]>([]);
  const [sets, setSets] = useState<SetItem[]>([]);
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set());
  const [loadingSet, setLoadingSet] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('cards')
      .select('id, tcg_card_id, type')
      .eq('user_id', user.id)
      .eq('active', true)
      .then(({ data }) => setInventory(data ?? []));
  }, [user]);

  useEffect(() => {
    supabase
      .from('sets')
      .select('id, name, serie, release_date')
      .order('release_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => setSets(data ?? []));
  }, []);

  const seriesOrder = [...new Set(
    sets
      .filter(s => s.release_date)
      .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
      .map(s => s.serie)
  )];

  const toggleSerie = (serie: string) => {
    setOpenSeries(prev => {
      const next = new Set(prev);
      next.has(serie) ? next.delete(serie) : next.add(serie);
      return next;
    });
  };

  const handleSetClick = async (setId: string) => {
    setLoadingSet(true);
    clear();
    setQuery('');
    
    const res = await fetch(`https://api.tcgdex.net/v2/en/cards?set.id=${setId}&pagination:itemsPerPage=250`);
    const data = await res.json();
    const cards = Array.isArray(data) ? data.filter((c: any) => c.image) : [];

    setSetResults(cards.map((c: any) => ({
      id: c.id,
      name: c.name,
      localId: c.localId,
      image: c.image ?? '',
      set: { id: setId, name: sets.find(s => s.id === setId)?.name ?? '' },
    })));
    setLoadingSet(false);
  };

  const [setResults, setSetResults] = useState<PokemonCard[]>([]);

  const displayResults = query.trim() ? results : setResults;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSetResults([]);
    search(query);
  };

  const handleSelectCard = (card: PokemonCard) => {
    if (queue.some(q => q.card.id === card.id)) {
      setQueue(prev => prev.filter(q => q.card.id !== card.id));
      return;
    }
    setQueue(prev => [...prev, { card, price: '', quantity: '1', type: 'sell', condition: 'NM' }]);
  };

  const handleQueueUpdate = (cardId: string, field: 'price' | 'quantity' | 'type' | 'condition', value: string) => {
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
      condition: q.condition,
    }));

    const { data, error: supabaseError } = await supabase.from('cards').insert(rows).select();

    if (!supabaseError && data) {
      setInventory(prev => [...prev, ...data.map(c => ({ id: c.id, tcg_card_id: c.tcg_card_id, type: c.type }))]);
      setQueue([]);
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />
      <div className="flex max-w-6xl mx-auto px-4 py-8 gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden md:block">
          <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">Sets</h2>
          <div className="flex flex-col gap-1">
            {seriesOrder.map(serie => (
              <div key={serie}>
                <button
                  onClick={() => toggleSerie(serie)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#888] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                >
                  <span>{serie}</span>
                  <span className="text-xs">{openSeries.has(serie) ? '▲' : '▼'}</span>
                </button>
                {openSeries.has(serie) && (
                  <div className="ml-3 flex flex-col gap-0.5 mb-1">
                    {sets.filter(s => s.serie === serie).map(set => (
                      <button
                        key={set.id}
                        onClick={() => handleSetClick(set.id)}
                        className="text-left px-3 py-1.5 rounded text-xs text-[#555] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                      >
                        {set.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Search */}
          <section className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Nome (ex: Charizard) ou Set+Número (ex: MEG 001)"
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
          {/* Results */}
          {(displayResults.length > 0 || loadingSet) && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">
                {loadingSet ? 'Carregando...' : `Resultados (${displayResults.length}${hasMore ? '+' : ''})`}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {displayResults.map(card => {
                  const inQueue = queue.some(q => q.card.id === card.id);
                  const inSell = inventory.some(c => c.tcg_card_id === card.id && c.type === 'sell');
                  const inWant = inventory.some(c => c.tcg_card_id === card.id && c.type === 'want');
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
                        <CardImage src={card.image ? card.image + '/low.webp' : ''} alt={card.name} className="rounded" />
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

              {hasMore && query.trim() && (
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
            <section className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Cartas selecionadas</h2>
              <div className="flex flex-col gap-2">
                {queue.map(({ card, price, quantity, type, condition }) => (
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
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${type === 'sell' ? 'bg-[#e3350d] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0]'}`}
                      >
                        Vendo
                      </button>
                      <button
                        onClick={() => handleQueueUpdate(card.id, 'type', 'want')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${type === 'want' ? 'bg-[#3b82f6] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0]'}`}
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
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={quantity}
                        onChange={e => handleQueueUpdate(card.id, 'quantity', e.target.value)}
                        min="1"
                        className="w-14 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
                      />
                      <select
                        value={condition}
                        onChange={e => handleQueueUpdate(card.id, 'condition', e.target.value)}
                        className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] transition-colors cursor-pointer"
                      >
                        <option value="M">M</option>
                        <option value="NM">NM</option>
                        <option value="LP">LP</option>
                        <option value="MP">MP</option>
                        <option value="HP">HP</option>
                        <option value="DMG">DMG</option>
                      </select>
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
        </main>
      </div>
    </div>
  );
};

export default Search
