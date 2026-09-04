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
import { VARIANT_OPTIONS, type CardVariant } from '../constants/variants'
import { resolveAllowedVariants } from '../lib/variants'
import SetLogo from '../components/ui/SetLogo'
import { SETS_EN_IMAGES } from '../constants/cards'
import { tcgdexFetch } from '../lib/tcgdex'

const FOIL_MAP: Record<string, CardVariant> = {
  pokeball: 'pokeball',
  masterball: 'masterball',
  cosmos: 'cosmos',
  energy: 'energy_pattern'
}

const TYPE_MAP: Record<string, CardVariant> = {
  normal: 'normal',
  holo: 'holo',
  reverse: 'reverse',
}

interface QueuedCard {
  uid: string,
  card: PokemonCard,
  price: string,
  quantity: string,
  type: 'sell' | 'want',
  condition: string,
  language: string,
  rarity: string | null,
  variant: string,
  types: string[] | null,
  allowedVariants: CardVariant[] | null
}

type InventoryCard = Pick<TradexCard, 'id' | 'tcg_card_id' | 'type'>;

interface SidebarContentProps {
  seriesOrder: string[];
  openSeries: Set<string>;
  selectedSet: SetItem | null;
  toggleSerie: (serie: string) => void;
  setsBySerie: (serie: string) => SetItem[];
  getSerieLabel: (serieId: string) => string;
  handleSetClick: (setId: string) => void;
}

const SidebarContent = ({ seriesOrder, openSeries, selectedSet, toggleSerie, setsBySerie, getSerieLabel, handleSetClick }: SidebarContentProps) => (
  <div className="flex flex-col gap-1">
    {seriesOrder.map(serieId => (
      <div key={serieId}>
        <button
          onClick={() => toggleSerie(serieId)}
          className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#888] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
        >
          <span>{getSerieLabel(serieId)}</span>
          <span className="text-xs">{openSeries.has(serieId) ? '▲' : '▼'}</span>
        </button>
        {openSeries.has(serieId) && (
          <div className="ml-3 flex flex-col gap-0.5 mb-1">
            {setsBySerie(serieId).map(set => (
              <button
                key={set.id}
                onClick={() => handleSetClick(set.id)}
                className={`text-left flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors cursor-pointer w-full ${
                  selectedSet?.id === set.id
                    ? 'text-[#f0f0f0] bg-[#2a2a2a]'
                    : 'text-[#555] hover:text-[#f0f0f0] hover:bg-[#1a1a1a]'
                }`}
              >
                {set.symbol_url ? (
                  <img src={set.symbol_url} alt="" className="h-4 w-4 object-contain shrink-0 bg-white rounded-sm p-px" />
                ) : (
                  <div className="h-4 w-4 shrink-0 bg-[#2a2a2a] rounded-sm" />
                )}
                <span className="truncate">{set.name_pt ?? set.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
)

const Search = () => {
  const { user } = useAuth();
  const { results, loading: searching, error, search, clear } = usePokemonSearch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [setFilter, setSetFilter] = useState('');
  const [loadingSet, setLoadingSet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [queue, setQueue] = useState<QueuedCard[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryCard[]>([]);
  const [setResults, setSetResults] = useState<PokemonCard[]>([]);
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set());
  const [selectedSet, setSelectedSet] = useState<SetItem | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'number'>('recent');

  const [masterOpen, setMasterOpen] = useState(false);
  const [masterValues, setMasterValues] = useState<{
    type: 'sell' | 'want' | '';
    variant: string;
    price: string;
    quantity: string;
    condition: string;
    language: string;
  }>({ type: '', variant: '', price: '', quantity: '', condition: '', language: '' });

  const resetMaster = () => {
    setMasterValues({ type: '', variant: '', price: '', quantity: '', condition: '', language: '' });
    setMasterOpen(false);
  };

  const openPreview = (card: PokemonCard) => {
    setPreviewIndex(displayResults.findIndex(c => c.id === card.id));
    setPreviewOpen(true);
  }

  const { sets, series: _, loading: loadingSets, seriesOrder, setsBySerie, getSerieLabel, getSerieById } = useSets();

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
    setSetResults([]);
    setSelectedSet(sets.find(s => s.id === setId) ?? null);
    setSortBy(prev => prev === 'recent' ? 'number' : prev);
    setSetFilter('');

    const setInfo = sets.find(s => s.id === setId);

    const [ptRes, enRes] = await Promise.all([
      tcgdexFetch(`v2/pt/cards?set.id=${setId}&pagination:itemsPerPage=300`),
      tcgdexFetch(`v2/en/cards?set.id=${setId}&pagination:itemsPerPage=300`),
    ]);

    const [ptData, enData] = await Promise.all([
      ptRes.ok ? ptRes.json() : [],
      enRes.ok ? enRes.json() : [],
    ]);

    const ptCards = Array.isArray(ptData) ? ptData.filter((c: any) => c.id.startsWith(setId + '-')) : [];
    const enCards = Array.isArray(enData) ? enData.filter((c: any) => c.id.startsWith(setId + '-')) : [];

    const ptMap = new Map<string, any>();
    for (const c of ptCards) ptMap.set(c.id, c);

    if (setInfo?.serie_id) {
      setOpenSeries(prev => new Set(prev).add(setInfo.serie_id!));
    }

    const tcgdexSerieId = getSerieById(setInfo?.serie_id ?? '')?.tcgdex_serie_id;

    setSetResults(enCards.map((c: any) => ({
      id: c.id,
      name: c.name,
      name_pt: ptMap.get(c.id)?.name ?? null,
      localId: c.localId,
      image: c.image ?? (tcgdexSerieId ? `https://assets.tcgdex.net/en/${tcgdexSerieId}/${setId}/${c.localId}` : ''),
      set: {
        id: setId,
        name: setInfo?.name ?? '',
        ptcgo_code: setInfo?.ptcgo_code ?? null,
      },
    })));
    setLoadingSet(false);
  }

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
    const uid = crypto.randomUUID();
    setQueue(prev => [...prev, {
      uid,
      card,
      price: '',
      quantity: '1',
      type: 'sell',
      condition: 'NM',
      language: 'BR',
      rarity: null,
      variant: 'normal',
      types: null,
      allowedVariants: null
    }]);

    try {
      const res = await tcgdexFetch(`v2/en/cards/${card.id}`);
      if (res.ok) {
        const data = await res.json();
        const allowedVariants = resolveAllowedVariants(data);
        console.log("CARD", data)
        setQueue(prev => prev.map(q =>
          q.uid === uid ? {
            ...q,
            rarity: data.rarity ?? null,
            types: data.types ?? null,
            allowedVariants,
            variant: allowedVariants?.includes(q.variant as CardVariant) ? q.variant : (allowedVariants?.[0] ?? q.variant)
          } : q
        ));
      }
    } catch { /* */ }
  }

  const handleQueueUpdate = (uid: string, field: 'price' | 'quantity' | 'type' | 'condition' | 'language' | 'variant', value: string) => {
    setQueue(prev => prev.map(q => {
      if (q.uid !== uid) return q;
      const updated = { ...q, [field]: value };
      if (field === 'type' && value === 'want') updated.condition = 'ANY';
      if (field === 'type' && value === 'sell' && q.condition === 'ANY') updated.condition = 'NM';
      return updated;
    }));
  }

  const handleQueueRemove = (uid: string) => {
    setQueue(prev => prev.filter(q => q.uid !== uid));
  }

  const handleApplyMaster = () => {
    setQueue(prev => prev.map(q => {
      const updated = { ...q };
      if (masterValues.type) updated.type = masterValues.type;
      if (masterValues.variant) updated.variant = masterValues.variant;
      if (masterValues.price) updated.price = masterValues.price;
      if (masterValues.quantity) updated.quantity = masterValues.quantity;
      if (masterValues.condition) updated.condition = masterValues.condition;
      if (masterValues.language) updated.language = masterValues.language;
      if (masterValues.type === 'want') updated.condition = masterValues.condition || 'ANY';
      if (masterValues.type === 'sell' && updated.condition === 'ANY') updated.condition = masterValues.condition || 'NM';
      return updated;
    }));
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
      name_pt: q.card.name_pt ?? null,
      set_name: q.card.set.name,
      image_url: q.card.image ? q.card.image + '/low.webp' : '',
      price: q.price ? parseFloat(q.price) : null,
      quantity: parseInt(q.quantity),
      active: true,
      type: q.type,
      condition: q.condition,
      language: q.language,
      rarity: q.rarity,
      variant: q.variant,
      types: q.types
    }));

    const queueKeys = rows.map(r => `${r.tcg_card_id}|${r.type}|${r.condition}|${r.language}|${r.variant}`);
    const hasDuplicateInQueue = queueKeys.length !== new Set(queueKeys).size;

    const { data: existing } = await supabase
      .from('cards')
      .select('tcg_card_id, type, condition, language, variant')
      .eq('user_id', user.id)
      .eq('active', true);

    const existingKeys = new Set((existing ?? []).map(c => `${c.tcg_card_id}|${c.type}|${c.condition}|${c.language}|${c.variant}`));
    const hasDuplicateWithInventory = queueKeys.some(k => existingKeys.has(k));

    if (hasDuplicateInQueue || hasDuplicateWithInventory) {
      alert('Uma ou mais cartas já existem no seu inventário com a mesma condição, língua e variante. Ajuste antes de salvar.');
      setSaving(false);
      return;
    }

    const { data, error: supabaseError } = await supabase.from('cards').insert(rows).select();

    if (!supabaseError && data) {
      setInventory(prev => [...prev, ...data.map(c => ({ id: c.id, tcg_card_id: c.tcg_card_id, type: c.type }))]);
      setQueue([]);
      setQueueDrawerOpen(false);
      resetMaster();
    }

    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      {(drawerOpen || queueDrawerOpen) && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => { setDrawerOpen(false); setQueueDrawerOpen(false); }} />
      )}

      <div className={`fixed top-0 left-0 h-full w-72 bg-[#111] border-r border-[#2a2a2a] z-50 transform transition-transform duration-300 overflow-y-auto md:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Sets</h2>
          <button onClick={() => setDrawerOpen(false)} className="text-[#555] hover:text-[#f0f0f0] cursor-pointer text-lg">✕</button>
        </div>
        <div className="p-3">
          <SidebarContent
            seriesOrder={seriesOrder}
            openSeries={openSeries}
            selectedSet={selectedSet}
            toggleSerie={toggleSerie}
            setsBySerie={setsBySerie}
            getSerieLabel={getSerieLabel}
            handleSetClick={handleSetClick}
          />
        </div>
      </div>

      <div className={`fixed top-0 right-0 h-full w-full md:max-w-md bg-[#111] border-l border-[#2a2a2a] z-50 transform transition-transform duration-300 flex flex-col ${queueDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Selecionadas ({queue.length})</h2>
          <button onClick={() => setQueueDrawerOpen(false)} className="text-[#555] hover:text-[#f0f0f0] cursor-pointer text-lg">✕</button>
        </div>

        {queue.length > 0 && (
          <div className="shrink-0 bg-[#111] border-b border-[#2a2a2a]">
            <button
              onClick={() => setMasterOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
            >
              <p className="text-[10px] text-[#555] uppercase tracking-wider font-semibold">Aplicar a todas</p>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#555] transition-transform shrink-0 ${masterOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {masterOpen && (
              <div className="px-4 pb-3 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_1fr_120px] gap-2">
                    <span className="text-[10px] text-[#444] uppercase tracking-wider col-span-2">Tipo</span>
                    <span className="text-[10px] text-[#444] uppercase tracking-wider">Variante</span>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_120px] gap-2 items-center">
                    <button
                      onClick={() => setMasterValues(prev => ({ ...prev, type: prev.type === 'sell' ? '' : 'sell' }))}
                      className={`py-1 rounded text-xs font-semibold cursor-pointer ${masterValues.type === 'sell' ? 'bg-[#e3350d] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#555]'}`}
                    >Vendo</button>
                    <button
                      onClick={() => setMasterValues(prev => ({ ...prev, type: prev.type === 'want' ? '' : 'want' }))}
                      className={`py-1 rounded text-xs font-semibold cursor-pointer ${masterValues.type === 'want' ? 'bg-[#3b82f6] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#555]'}`}
                    >Procuro</button>
                    <select
                      value={masterValues.variant}
                      onChange={e => setMasterValues(prev => ({ ...prev, variant: e.target.value }))}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#888] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                    >
                      <option value="">— variante —</option>
                      {VARIANT_OPTIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_40px_52px_52px] gap-2">
                    <span className="text-[10px] text-[#444] uppercase tracking-wider">Preço</span>
                    <span className="text-[10px] text-[#444] uppercase tracking-wider">Qtd</span>
                    <span className="text-[10px] text-[#444] uppercase tracking-wider">Cond.</span>
                    <span className="text-[10px] text-[#444] uppercase tracking-wider">Língua</span>
                  </div>
                  <div className="grid grid-cols-[1fr_40px_52px_52px] gap-2 items-center">
                    <input
                      type="number"
                      placeholder="R$"
                      value={masterValues.price}
                      onChange={e => setMasterValues(prev => ({ ...prev, price: e.target.value }))}
                      min="0" step="0.01"
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#e3350d]"
                    />
                    <input
                      type="number"
                      placeholder="1"
                      value={masterValues.quantity}
                      onChange={e => setMasterValues(prev => ({ ...prev, quantity: e.target.value }))}
                      min="1"
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#e3350d]"
                    />
                    <select
                      value={masterValues.condition}
                      onChange={e => setMasterValues(prev => ({ ...prev, condition: e.target.value }))}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-[#888] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                    >
                      <option value="">—</option>
                      <option value="ANY">?</option>
                      <option value="M">M</option>
                      <option value="NM">NM</option>
                      <option value="LP">LP</option>
                      <option value="MP">MP</option>
                      <option value="HP">HP</option>
                      <option value="DMG">DMG</option>
                    </select>
                    <select
                      value={masterValues.language}
                      onChange={e => setMasterValues(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-[#888] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                    >
                      <option value="">—</option>
                      <option value="BR">BR</option>
                      <option value="EN">EN</option>
                      <option value="JP">JP</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleApplyMaster}
                  className="w-full py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-[#f0f0f0] text-xs font-semibold rounded cursor-pointer transition-colors"
                >
                  Aplicar a todas
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {queue.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta selecionada.</p>
          ) : (
            queue.map(({ uid, card, price, quantity, type, condition, language, variant, allowedVariants }) => (
              <div key={uid} className="flex flex-col gap-2.5 border-b border-[#2a2a2a] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-[#f0f0f0]">{card.name_pt ?? card.name}</span>
                    <span className="text-xs text-[#555] mx-1">·</span>
                    <span className="text-xs text-[#888]">{(card.set.ptcgo_code ?? card.set.id).toUpperCase()} #{card.localId}</span>
                  </div>
                  <button onClick={() => handleQueueRemove(uid)} className="text-xs text-[#555] hover:text-[#e3350d] cursor-pointer">✕</button>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_1fr_120px] gap-2">
                    <span className="text-[10px] text-[#555] uppercase tracking-wider col-span-2">Tipo</span>
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">Variante</span>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_120px] gap-2 items-center">
                    <button onClick={() => handleQueueUpdate(uid, 'type', 'sell')} className={`py-1 rounded text-xs font-semibold cursor-pointer ${type === 'sell' ? 'bg-[#e3350d] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888]'}`}>Vendo</button>
                    <button onClick={() => handleQueueUpdate(uid, 'type', 'want')} className={`py-1 rounded text-xs font-semibold cursor-pointer ${type === 'want' ? 'bg-[#3b82f6] text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-[#888]'}`}>Procuro</button>
                    <select value={variant} onChange={e => handleQueueUpdate(uid, 'variant', e.target.value)} className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
                      {(allowedVariants ? VARIANT_OPTIONS.filter(v => allowedVariants.includes(v.value)) : VARIANT_OPTIONS).map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_40px_52px_52px] gap-2">
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">Preço</span>
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">Qtd</span>
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">Cond.</span>
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">Língua</span>
                  </div>
                  <div className="grid grid-cols-[1fr_40px_52px_52px] gap-2 items-center">
                    <input type="number" placeholder={type === 'sell' ? 'R$' : 'Até R$'} value={price} onChange={e => handleQueueUpdate(uid, 'price', e.target.value)} min="0" step="0.01" className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]" />
                    <input type="number" placeholder="1" value={quantity} onChange={e => handleQueueUpdate(uid, 'quantity', e.target.value)} min="1" className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]" />
                    <select value={condition} onChange={e => handleQueueUpdate(uid, 'condition', e.target.value)} className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
                      {type === 'want' && <option value="ANY">?</option>}
                      <option value="M">M</option>
                      <option value="NM">NM</option>
                      <option value="LP">LP</option>
                      <option value="MP">MP</option>
                      <option value="HP">HP</option>
                      <option value="DMG">DMG</option>
                    </select>
                    <select value={language} onChange={e => handleQueueUpdate(uid, 'language', e.target.value)} className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
                      <option value="BR">BR</option>
                      <option value="EN">EN</option>
                      <option value="JP">JP</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {queue.length > 0 && (
          <div className="shrink-0 border-t border-[#2a2a2a] px-4 py-3 flex gap-3">
            <button
              onClick={handleAddAll}
              disabled={saving || queue.some(q => q.type === 'sell' && !q.price)}
              className="flex-1 bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2.5 text-sm cursor-pointer"
            >
              {saving ? 'Salvando...' : `Adicionar ${queue.length > 1 ? `${queue.length} cartas` : 'carta'}`}
            </button>
            <button
              onClick={() => { setQueue([]); resetMaster(); }}
              className="text-sm text-[#888] hover:text-[#f0f0f0] cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      <div className={`max-w-6xl mx-auto px-4 py-6 md:flex md:gap-6 ${queue.length > 0 ? 'pb-24' : ''}`}>
        <aside className="hidden md:block w-56 shrink-0">
          <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">Sets</h2>
          <SidebarContent
            seriesOrder={seriesOrder}
            openSeries={openSeries}
            selectedSet={selectedSet}
            toggleSerie={toggleSerie}
            setsBySerie={setsBySerie}
            getSerieLabel={getSerieLabel}
            handleSetClick={handleSetClick}
          />
        </aside>

        <div className="flex-1 min-w-0">
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

          {isSetSearch && selectedSet && (
            <>
              <div className="flex items-center gap-4 mb-4 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
                <SetLogo logoUrl={selectedSet.logo_url_pt ?? selectedSet.logo_url ?? null} name={selectedSet.name_pt ?? selectedSet.name} />
                <div>
                  <p className="font-semibold text-[#f0f0f0]">{selectedSet.name_pt ?? selectedSet.name}</p>
                  <p className="text-xs text-[#888]">
                    {selectedSet.release_date ?? 'Data desconhecida'} · {selectedSet.official_count ?? '?'} cartas base · {selectedSet.total ?? setResults.length} total
                  </p>
                </div>
              </div>
              <input
                type="text"
                placeholder={`Buscar em ${selectedSet.name_pt ?? selectedSet.name}...`}
                value={setFilter}
                onChange={e => setSetFilter(e.target.value)}
                className="w-full mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
              />
            </>
          )}

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
                  return (() => {
                    const inQueue = queue.some(q => q.card.id === card.id);
                    const inSell = inventory.some(c => c.tcg_card_id === card.id && c.type === 'sell');
                    const inWant = inventory.some(c => c.tcg_card_id === card.id && c.type === 'want');
                    const both = inSell && inWant;

                    const borderClass = inQueue
                      ? both
                        ? 'border-2 border-transparent'
                        : inSell
                        ? 'border-2 border-[#e3350d]'
                        : inWant
                        ? 'border-2 border-[#3b82f6]'
                        : 'border-2 border-white'
                      : both
                      ? 'border border-transparent'
                      : inSell
                      ? 'border border-[#e3350d]'
                      : inWant
                      ? 'border border-[#3b82f6]'
                      : 'border border-[#2a2a2a] hover:border-[#e3350d]';

                    const gradientStyle = both
                      ? { background: 'linear-gradient(#1a1a1a, #1a1a1a) padding-box, linear-gradient(to right, #e3350d, #3b82f6) border-box' }
                      : {};

                    return (
                      <div
                        key={card.id}
                        style={gradientStyle}
                        onClick={() => handleSelectCard(card)}
                        className={`group flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1a1a1a] transition-colors cursor-pointer ${borderClass}`}
                      >
                        <div className="relative w-full">
                          <CardImage
                            src={card.image ? card.image + '/low.webp' : ''}
                            alt={card.name}
                            className="rounded"
                            language={SETS_EN_IMAGES.has(card.set.id) ? 'EN' : 'BR'}
                          />
                          {inQueue && (
                            <>
                              <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center z-10">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      const entries = queue.filter(q => q.card.id === card.id);
                                      if (entries.length === 1) {
                                        handleQueueRemove(entries[0].uid);
                                      } else {
                                        handleQueueRemove(entries[entries.length - 1].uid);
                                      }
                                    }}
                                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white font-bold text-lg flex items-center justify-center cursor-pointer"
                                  >−</button>
                                  <span className="text-white font-bold text-base w-4 text-center">
                                    {queue.filter(q => q.card.id === card.id).length}
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleSelectCard(card); }}
                                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white font-bold text-lg flex items-center justify-center cursor-pointer"
                                  >+</button>
                                </div>
                              </div>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setQueue(prev => prev.filter(q => q.card.id !== card.id));
                                }}
                                className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white text-xs flex items-center justify-center cursor-pointer z-20"
                              >✕</button>
                            </>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); openPreview(card); }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center cursor-pointer z-10"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-col items-center text-xs text-center leading-tight text-[#888] group-hover:text-[#f0f0f0] transition-colors">
                          <span>{card.name_pt ?? card.name}</span>
                          <span>{(sets.find(s => s.id === card.set.id)?.ptcgo_code ?? card.set.id).toUpperCase()} #{card.localId}</span>
                        </div>
                      </div>
                    );
                  })();
                })}
              </div>

              {!isSetSearch && (
                <Pagination current={page} total={totalPages} onChange={setPage} />
              )}
            </section>
          )}

          {!isSetSearch && !searching && error && (
            <p className="text-sm text-[#555] text-center py-8">{error}</p>
          )}

          {isSetSearch && !loadingSet && filteredSetResults.length === 0 && setFilter.trim() && (
            <p className="text-sm text-[#555] text-center py-8">Nenhuma carta encontrada para "{setFilter}".</p>
          )}
        </div>
      </div>

      {queue.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-30">
          <div className="flex items-center gap-2 w-full max-w-sm">
            <button
              onClick={() => { setQueue([]); resetMaster(); }}
              className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] font-semibold rounded-xl px-4 py-3 shadow-lg transition-colors cursor-pointer shrink-0 text-sm"
            >
              Limpar
            </button>
            <button
              onClick={() => setQueueDrawerOpen(true)}
              className="flex-1 bg-[#e3350d] hover:bg-[#c42d0b] text-white font-semibold rounded-xl px-4 py-3 shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <svg className="hidden sm:block shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              <span className="sm:hidden">Adicionar ({queue.length})</span>
              <span className="hidden sm:inline">Adicionar ({queue.length} {queue.length === 1 ? 'carta' : 'cartas'})</span>
            </button>
          </div>
        </div>
      )}

      {previewOpen && (
        <CardModal
          cards={displayResults.map(c => ({ ...c, localId: c.localId }))}
          currentIndex={previewIndex}
          onIndexChange={setPreviewIndex}
          onClose={() => setPreviewOpen(false)}
          sets={sets}
        />
      )}
    </div>
  )
}

export default Search
