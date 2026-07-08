import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import usePokemonSearch, { type PokemonCard } from '../hooks/usePokemonSearch'
import CardImage from '../components/CardImage'
import Navbar from '../components/Navbar'
import type { SetItem, TradexCard } from '../types'
import Pagination from '../components/ui/Pagination'

interface QueuedCard {
  card: PokemonCard,
  price: string,
  quantity: string,
  type: 'sell' | 'want',
  condition: string,
  language: string,
}

type InventoryCard = Pick<TradexCard, 'id' | 'tcg_card_id' | 'type'>;

const Search = () => {
  const { user } = useAuth();
  const { results, loading: searching, error, search, clear } = usePokemonSearch();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [sets, setSets] = useState<SetItem[]>([]);
  const [loadingSet, setLoadingSet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedCard[]>([]);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryCard[]>([]);
  const [setResults, setSetResults] = useState<PokemonCard[]>([]);
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set());
  const [selectedSet, setSelectedSet] = useState<SetItem | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'number'>('recent');

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
      .select('id, name, serie, release_date, ptcgo_code, logo_url, official_count, total')
      .order('release_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => setSets(data ?? []));
  }, []);

  const seriesWithDate = [...new Set(
    sets.filter(s => s.release_date)
      .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
      .map(s => s.serie)
  )];
  const seriesWithoutDate = [...new Set(
    sets.filter(s => !s.release_date).map(s => s.serie)
  )].filter(s => !seriesWithDate.includes(s));
  const seriesOrder = [...seriesWithDate, ...seriesWithoutDate].filter(s => s !== 'Other');
  seriesOrder.push('Other');

  const toggleSerie = (serie: string) => {
    setOpenSeries(prev => {
      const next = new Set(prev);
      next.has(serie) ? next.delete(serie) : next.add(serie);
      return next;
    });
  };

  const handleSetClick = async (setId: string) => {
    setLoadingSet(true);
    setDrawerOpen(false);
    clear();
    setQuery('');
    setPage(1);
    setSelectedSet(sets.find(s => s.id === setId) ?? null);

    const res = await fetch(`https://api.tcgdex.net/v2/en/cards?set.id=${setId}&pagination:itemsPerPage=250`);
    const data = await res.json();
    const cards = Array.isArray(data)
      ? data.filter((c: any) => c.image && c.id.startsWith(setId + '-'))
      : [];
    const setInfo = sets.find(s => s.id === setId);

    setSetResults(cards.map((c: any) => ({
      id: c.id,
      name: c.name,
      localId: c.localId,
      image: c.image ?? '',
      set: {
        id: setId,
        name: setInfo?.name ?? '',
        ptcgo_code: setInfo?.ptcgo_code ?? null,
      },
    })));
    setLoadingSet(false);
  };

  const pageSize = 20;
  const isSetSearch = setResults.length > 0 && !query.trim();

  const allResults = isSetSearch ? setResults : results;
  const totalPages = isSetSearch ? 1 : Math.ceil(allResults.length / pageSize);

  const sortedResults = [...allResults].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'number') return a.localId.localeCompare(b.localId, undefined, { numeric: true });
    const dateA = sets.find(s => s.id === a.set.id)?.release_date ?? '';
    const dateB = sets.find(s => s.id === b.set.id)?.release_date ?? '';
    return dateB.localeCompare(dateA);
  });

  const displayResults = isSetSearch  ? sortedResults : sortedResults.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSetResults([]);
    setPage(1);
    search(query);
  };

  const handleSelectCard = (card: PokemonCard) => {
    if (queue.some(q => q.card.id === card.id)) {
      setQueue(prev => prev.filter(q => q.card.id !== card.id));
      return;
    }
    setQueue(prev => [...prev, { card, price: '', quantity: '1', type: 'sell', condition: 'NM', language: 'BR' }]);
  };

  const handleQueueUpdate = (cardId: string, field: 'price' | 'quantity' | 'type' | 'condition' | 'language', value: string) => {
    setQueue(prev => prev.map(q => {
      if (q.card.id !== cardId) return q;
      const updated = { ...q, [field]: value };
      if (field === 'type' && value === 'want') updated.condition = 'ANY';
      if (field === 'type' && value === 'sell' && q.condition === 'ANY') updated.condition = 'NM';
      return updated;
    }));
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
      language: q.language
    }));

    const { data, error: supabaseError } = await supabase.from('cards').insert(rows).select();

    if (!supabaseError && data) {
      setInventory(prev => [...prev, ...data.map(c => ({ id: c.id, tcg_card_id: c.tcg_card_id, type: c.type }))]);
      setQueue([]);
      setQueueDrawerOpen(false);
    }

    setSaving(false);
  };

  const SidebarContent = () => (
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
              {sets
                .filter(s => s.serie === serie)
                .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
                .map(set => (
                  <button
                    key={set.id}
                    onClick={() => handleSetClick(set.id)}
                    className={`text-left px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                      selectedSet?.id === set.id
                        ? 'text-[#f0f0f0] bg-[#2a2a2a]'
                        : 'text-[#555] hover:text-[#f0f0f0] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {set.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      {(drawerOpen || queueDrawerOpen) && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => { setDrawerOpen(false); setQueueDrawerOpen(false); }} />
      )}

      {/* Sets drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#111] border-r border-[#2a2a2a] z-50 transform transition-transform duration-300 overflow-y-auto md:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Sets</h2>
          <button onClick={() => setDrawerOpen(false)} className="text-[#555] hover:text-[#f0f0f0] cursor-pointer text-lg">✕</button>
        </div>
        <div className="p-3"><SidebarContent /></div>
      </div>

      {/* Queue drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#111] border-l border-[#2a2a2a] z-50 transform transition-transform duration-300 overflow-y-auto ${queueDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Selecionadas ({queue.length})</h2>
          <button onClick={() => setQueueDrawerOpen(false)} className="text-[#555] hover:text-[#f0f0f0] cursor-pointer text-lg">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {queue.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta selecionada.</p>
          ) : (
            <>
              {queue.map(({ card, price, quantity, type, condition, language }) => (
                <div key={card.id} className="flex flex-col gap-2 border-b border-[#2a2a2a] pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[#f0f0f0]">{card.name}</span>
                      <span className="text-xs text-[#555] mx-1">·</span>
                      <span className="text-xs text-[#888]">{(card.set.ptcgo_code ?? card.set.id).toUpperCase()} #{card.localId}</span>
                    </div>
                    <button onClick={() => handleQueueRemove(card.id)} className="text-xs text-[#555] hover:text-[#e3350d] cursor-pointer">✕</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleQueueUpdate(card.id, 'type', 'sell')} className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${type === 'sell' ? 'bg-[#e3350d] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888]'}`}>Vendo</button>
                    <button onClick={() => handleQueueUpdate(card.id, 'type', 'want')} className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${type === 'want' ? 'bg-[#3b82f6] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888]'}`}>Procuro</button>
                    <input type="number" placeholder={type === 'sell' ? 'R$' : 'Até R$'} value={price} onChange={e => handleQueueUpdate(card.id, 'price', e.target.value)} min="0" step="0.01" className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]" />
                    <input type="number" placeholder="Qtd" value={quantity} onChange={e => handleQueueUpdate(card.id, 'quantity', e.target.value)} min="1" className="w-14 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]" />
                    <select value={condition} onChange={e => handleQueueUpdate(card.id, 'condition', e.target.value)} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
                      {type === 'want' && (
                        <option value="ANY">?</option>
                      )}
                      <option value="M">M</option>
                      <option value="NM">NM</option>
                      <option value="LP">LP</option>
                      <option value="MP">MP</option>
                      <option value="HP">HP</option>
                      <option value="DMG">DMG</option>
                    </select>
                    <select
                      value={language}
                      onChange={e => handleQueueUpdate(card.id, 'language', e.target.value)}
                      className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                    >
                      <option value="BR">BR</option>
                      <option value="EN">EN</option>
                      <option value="JP">JP</option>
                    </select>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddAll} disabled={saving || queue.some(q => q.type === 'sell' && !q.price)} className="flex-1 bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2.5 text-sm cursor-pointer">
                  {saving ? 'Salvando...' : `Adicionar ${queue.length > 1 ? `${queue.length} cartas` : 'carta'}`}
                </button>
                <button onClick={() => setQueue([])} className="text-sm text-[#888] hover:text-[#f0f0f0] cursor-pointer">Limpar</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:flex md:gap-6">

        <aside className="hidden md:block w-56 shrink-0">
          <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">Sets</h2>
          <SidebarContent />
        </aside>

        <div className="flex-1 min-w-0">

          <section className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <button type="button" onClick={() => setDrawerOpen(true)} className="md:hidden bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e3350d] rounded-lg px-4 py-3 text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer shrink-0">☰</button>
              <input
                type="text"
                placeholder="Nome (ex: Charizard) ou Set+Número (ex: MEG 001)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
              />
              <button type="submit" disabled={searching} className="bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-3 text-sm cursor-pointer shrink-0">
                {searching ? '...' : '🔍'}
              </button>
            </form>
            {error && <p className="text-sm text-[#e3350d] mt-2">{error}</p>}
          </section>

          {allResults.length > 0 && !isSetSearch && (
            <div className="flex items-center gap-2 my-3">
              <span className="text-xs text-[#555]">Ordenar:</span>
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer"
              >
                <option value="recent">Mais recente</option>
                <option value="name">Nome A→Z</option>
                <option value="number">Número</option>
              </select>
            </div>
          )}

          {isSetSearch && selectedSet && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
              {selectedSet.logo_url ? (
                <img src={selectedSet.logo_url} alt={selectedSet.name} className="h-10 object-contain" />
              ) : (
                <div className="h-10 w-24 bg-[#2a2a2a] rounded" />
              )}
              <div>
                <p className="font-semibold text-[#f0f0f0]">{selectedSet.name}</p>
                <p className="text-xs text-[#888]">
                  {selectedSet.release_date ?? 'Data desconhecida'} · {selectedSet.official_count ?? '?'} cartas base · {selectedSet.total ?? setResults.length} total
                </p>
              </div>
            </div>
          )}

          {(displayResults.length > 0 || loadingSet || searching) && (
            <section className="mb-6">
              {(!isSetSearch) && (
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">
                  {loadingSet || searching
                    ? 'Carregando...'
                    : `Resultados (${allResults.length})${totalPages > 1 ? ` — página ${page} de ${totalPages}` : ''}`
                  }
                </h2>
              )}
              {(loadingSet || searching) && (
                <p className="text-sm text-[#555] mb-3">Carregando...</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
                      <div className="flex flex-col items-center text-xs text-center leading-tight text-[#888] group-hover:text-[#f0f0f0] transition-colors">
                        {inSell ? '● Vendo' : inWant ? '● Procuro' : (
                          <>
                            <span>{card.name}</span>
                            <span>{(sets.find(s => s.id === card.set.id)?.ptcgo_code ?? card.set.id).toUpperCase()} #{card.localId}</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {!isSetSearch && (
                <Pagination current={page} total={totalPages} onChange={setPage} />
              )}
            </section>
          )}
        </div>
      </div>

      {queue.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 z-30">
          <button
            onClick={() => setQueueDrawerOpen(true)}
            className="bg-[#e3350d] hover:bg-[#c42d0b] text-white font-semibold rounded-xl px-8 py-4 shadow-lg transition-colors flex items-center gap-3 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Confirmar seleção ({queue.length} {queue.length === 1 ? 'carta' : 'cartas'})
          </button>
        </div>
      )}
    </div>
  );
};

export default Search
