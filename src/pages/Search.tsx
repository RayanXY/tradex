import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/layout/Navbar'
import Pagination from '../components/ui/Pagination'
import CardModal from '../components/cards/CardModal'
import CardImage from '../components/cards/CardImage'
import type { SetItem, TradexCard } from '../types'
import useSets from '../hooks/useSets'
import usePokemonSearch, { type PokemonCard } from '../hooks/usePokemonSearch'

interface QueuedCard {
  card: PokemonCard,
  price: string,
  quantity: string,
  type: 'sell' | 'want',
  condition: string,
  language: string,
  rarity: string | null
}

type InventoryCard = Pick<TradexCard, 'id' | 'tcg_card_id' | 'type'>;

const Search = () => {
  const { user } = useAuth();
  const { results, loading: searching, search, clear } = usePokemonSearch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [setFilter, setSetFilter] = useState('');
  const [loadingSet, setLoadingSet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedCard[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryCard[]>([]);
  const [setResults, setSetResults] = useState<PokemonCard[]>([]);
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set());
  const [selectedSet, setSelectedSet] = useState<SetItem | null>(null);
  const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'number'>('recent');

  const { sets, loading: loadingSets, seriesOrder, setsBySerie } = useSets();

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
    if (initialized || loadingSets || sets.length === 0) return;
    setInitialized(true);

    const q = searchParams.get('q');
    if (q) {
      search(q);
      return;
    }

    const latest = sets[0];
    if (latest) handleSetClick(latest.id);
  }, [sets, loadingSets, initialized]);

  useEffect(() => {
    if (!initialized) return;
    const q = searchParams.get('q');
    if (q) {
      setSelectedSet(null);
      setSetResults([]);
      search(q);
    }
  }, [searchParams]);

  const toggleSerie = (serie: string) => {
    setOpenSeries(prev => {
      const next = new Set(prev);
      next.has(serie) ? next.delete(serie) : next.add(serie);
      return next;
    });
  }

  const handleSetClick = async (setId: string) => {
    setSearchParams({});
    setLoadingSet(true);
    setDrawerOpen(false);
    clear();
    setPage(1);
    setSelectedSet(sets.find(s => s.id === setId) ?? null);
    setSortBy(prev => prev === 'recent' ? 'number' : prev);
    setSetFilter('');

    const res = await fetch(`https://api.tcgdex.net/v2/en/cards?set.id=${setId}&pagination:itemsPerPage=300`);
    const data = await res.json();
    const cards = Array.isArray(data)
      ? data.filter((c: any) => c.image && c.id.startsWith(setId + '-'))
      : [];
    const setInfo = sets.find(s => s.id === setId);

    if (setInfo) {
      setOpenSeries(prev => new Set(prev).add(setInfo.serie));
    }

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

  const isSetSearch = selectedSet !== null && results.length === 0;

  const allResults = isSetSearch ? setResults : results;
  const totalPages = Math.ceil(allResults.length / 20);

  const sortedResults = [...allResults].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'number') return a.localId.localeCompare(b.localId, undefined, { numeric: true });
    const dateA = sets.find(s => s.id === a.set.id)?.release_date ?? '';
    const dateB = sets.find(s => s.id === b.set.id)?.release_date ?? '';
    return dateB.localeCompare(dateA);
  });

  const filteredSetResults = isSetSearch && setFilter.trim()
    ? sortedResults.filter(c =>
        c.name.toLowerCase().includes(setFilter.toLowerCase()) ||
        c.localId.includes(setFilter.trim())
      )
    : sortedResults;

  const displayResults = isSetSearch
    ? filteredSetResults
    : sortedResults.slice((page - 1) * 20, page * 20);

  const handleSelectCard = async (card: PokemonCard) => {
    if (queue.some(q => q.card.id === card.id)) {
      setQueue(prev => prev.filter(q => q.card.id !== card.id));
      return;
    }
    setQueue(prev => [...prev, {
      card,
      price: '',
      quantity: '1',
      type: 'sell',
      condition: 'NM',
      language: 'BR',
      rarity: null
    }]);

    try {
      const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${card.id}`);
      if (res.ok) {
        const data = await res.json();
        setQueue(prev => prev.map(q =>
          q.card.id === card.id ? { ...q, rarity: data.rarity ?? null } : q
        ));
      }
    } catch {
      //
    }
  }

  const handleQueueUpdate = (cardId: string, field: 'price' | 'quantity' | 'type' | 'condition' | 'language', value: string) => {
    setQueue(prev => prev.map(q => {
      if (q.card.id !== cardId) return q;
      const updated = { ...q, [field]: value };
      if (field === 'type' && value === 'want') updated.condition = 'ANY';
      if (field === 'type' && value === 'sell' && q.condition === 'ANY') updated.condition = 'NM';
      return updated;
    }));
  }

  const handleQueueRemove = (cardId: string) => {
    setQueue(prev => prev.filter(q => q.card.id !== cardId));
  }

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
      language: q.language,
      rarity: q.rarity
    }));

    const { data, error: supabaseError } = await supabase.from('cards').insert(rows).select();

    if (!supabaseError && data) {
      setInventory(prev => [...prev, ...data.map(c => ({ id: c.id, tcg_card_id: c.tcg_card_id, type: c.type }))]);
      setQueue([]);
      setQueueDrawerOpen(false);
    }

    setSaving(false);
  }

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
              {setsBySerie(serie).map(set => (
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

      {(drawerOpen || queueDrawerOpen || !!previewCard) && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => { setDrawerOpen(false); setQueueDrawerOpen(false); }} />
      )}

      {/* Sets drawer mobile */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#111] border-r border-[#2a2a2a] z-50 transform transition-transform duration-300 overflow-y-auto md:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Sets</h2>
          <button onClick={() => setDrawerOpen(false)} className="text-[#555] hover:text-[#f0f0f0] cursor-pointer text-lg">✕</button>
        </div>
        <div className="p-3"><SidebarContent /></div>
      </div>

      {/* Queue drawer */}
      <div className={`fixed top-0 right-0 h-full w-full md:max-w-lg bg-[#111] border-l border-[#2a2a2a] z-50 transform transition-transform duration-300 overflow-y-auto ${queueDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
                      {type === 'want' && <option value="ANY">?</option>}
                      <option value="M">M</option>
                      <option value="NM">NM</option>
                      <option value="LP">LP</option>
                      <option value="MP">MP</option>
                      <option value="HP">HP</option>
                      <option value="DMG">DMG</option>
                    </select>
                    <select value={language} onChange={e => handleQueueUpdate(card.id, 'language', e.target.value)} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
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

          {/* Barra de controles: botão sets mobile + filtros + ordenação */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e3350d] rounded-lg px-4 py-2 text-sm text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer shrink-0"
            >
              ☰ Sets
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[#555]">Ordenar:</span>
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer"
              >
                {!isSetSearch && <option value="recent">Mais recente</option>}
                <option value="number">Número</option>
                <option value="name">Nome A→Z</option>
              </select>
            </div>
          </div>

          {/* Header do set selecionado */}
          {isSetSearch && selectedSet && (
            <>
              <div className="flex items-center gap-4 mb-4 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
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
              <input
                type="text"
                placeholder={`Buscar em ${selectedSet.name}...`}
                value={setFilter}
                onChange={e => setSetFilter(e.target.value)}
                className="w-full mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
              />
            </>
          )}

          {/* Resultados */}
          {(displayResults.length > 0 || loadingSet || searching) && (
            <section className="mb-6">
              {!isSetSearch && (
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">
                  {searching
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
                    <div
                      key={card.id}
                      onClick={() => !inInventory && handleSelectCard(card)}
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
                          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40">
                            <div className="w-8 h-8 rounded-full bg-[#e3350d] flex items-center justify-center">
                              <span className="text-white text-sm font-bold">✓</span>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setPreviewCard(card); }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center cursor-pointer z-10"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                          </svg>
                        </button>
                      </div>
                      <div className="flex flex-col items-center text-xs text-center leading-tight text-[#888] group-hover:text-[#f0f0f0] transition-colors">
                        {inSell ? '● Vendo' : inWant ? '● Procuro' : (
                          <>
                            <span>{card.name}</span>
                            <span>{(sets.find(s => s.id === card.set.id)?.ptcgo_code ?? card.set.id).toUpperCase()} #{card.localId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isSetSearch && (
                <Pagination current={page} total={totalPages} onChange={setPage} />
              )}
            </section>
          )}
          {isSetSearch && !loadingSet && filteredSetResults.length === 0 && setFilter.trim() && (
            <p className="text-sm text-[#555] text-center py-8">Nenhuma carta encontrada para "{setFilter}".</p>
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

      <CardModal card={previewCard} onClose={() => setPreviewCard(null)} />
    </div>
  )
}

export default Search
