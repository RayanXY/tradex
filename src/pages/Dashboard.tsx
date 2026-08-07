import { Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/layout/Navbar'
import Pagination from '../components/ui/Pagination'
import CardItem from '../components/cards/CardItem'
import CardModal from '../components/cards/CardModal'
import Tabs from '../components/ui/Tabs'
import type { TradexCard } from '../types'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import useSets from '../hooks/useSets'
import { useShowcaseCards } from '../hooks/useShowcaseCards'
import SetLogo from '../components/ui/SetLogo'

const PREVIEW_CARDS = 8;
const CARDS_PER_PAGE = 12;

const Dashboard = () => {
  const { user } = useAuth();
  const { sets } = useSets();

  const [sellPage, setSellPage] = useState(1);
  const [wantPage, setWantPage] = useState(1);
  const [sellTotal, setSellTotal] = useState(0);
  const [wantTotal, setWantTotal] = useState(0);
  const [modalIndex, setModalIndex] = useState(0);
  const [manageSearch, setManageSearch] = useState('');
  const [selling, setSelling] = useState<TradexCard[]>([]);
  const [wanting, setWanting] = useState<TradexCard[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'view' | 'manage'>('view');
  const [modalList, setModalList] = useState<'sell' | 'want' | null>(null);
  const [manageView, setManageView] = useState<'list' | 'bySet'>('list');
  const [openSets, setOpenSets] = useState<Record<string, boolean>>({});

  const { groups: sellGroups, loading: loadingSellGroups } = useShowcaseCards(
    manageView === 'bySet' ? (user?.id ?? null) : null,
    'sell'
  );
  const { groups: wantGroups, loading: loadingWantGroups } = useShowcaseCards(
    manageView === 'bySet' ? (user?.id ?? null) : null,
    'want'
  );

  const [editValues, setEditValues] = useState<{ price: string; quantity: string; condition: string; language: string; type: 'sell' | 'want'; variant: string }>({
    price: '', quantity: '1', condition: 'NM', language: 'BR', type: 'sell', variant: 'normal'
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', onConfirm: () => {} });

  const isSearching = manageSearch.trim().length > 0;

  const openModal = (card: TradexCard, list: 'sell' | 'want') => {
    const cards = list === 'sell' ? selling : wanting;
    const index = cards.findIndex(c => c.id === card.id);
    setModalList(list);
    setModalIndex(index);
  }

  const closeDialog = () => setConfirmDialog(prev => ({ ...prev, open: false }));

  const askConfirm = (opts: Omit<typeof confirmDialog, 'open'>) => {
    setConfirmDialog({ open: true, ...opts });
  }

  const handleRemoveConfirmed = (id: string, type: 'sell' | 'want') => {
    askConfirm({
      title: 'Remover carta?',
      description: 'A carta será removida do seu inventário.',
      confirmLabel: 'Remover',
      onConfirm: () => { handleRemove(id, type); closeDialog(); },
    });
  }

  const handleRemoveAll = async (type: 'sell' | 'want') => {
    askConfirm({
      title: type === 'sell' ? 'Remover todas as cartas à venda?' : 'Remover toda a lista de procura?',
      description: 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Remover todas',
      onConfirm: async () => {
        closeDialog();
        await supabase
          .from('cards')
          .update({ active: false })
          .eq('user_id', user!.id)
          .eq('type', type)
          .eq('active', true);

        if (type === 'sell') {
          setSellTotal(0);
          setSellPage(1);
          setSelling([]);
        } else {
          setWantTotal(0);
          setWantPage(1);
          setWanting([]);
        }
      },
    });
  }

  const loadCounts = useCallback(async () => {
    if (!user) return;
    const [{ count: sellCount }, { count: wantCount }] = await Promise.all([
      supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('active', true).eq('type', 'sell'),
      supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('active', true).eq('type', 'want'),
    ]);
    setSellTotal(sellCount ?? 0);
    setWantTotal(wantCount ?? 0);
    setLoadingDashboard(false);
  }, [user]);

  const loadSelling = useCallback(async () => {
    if (!user) return;
    if (activeTab === 'view') {
      const { data } = await supabase
        .from('cards').select('*')
        .eq('user_id', user.id).eq('active', true).eq('type', 'sell')
        .order('created_at', { ascending: false })
        .limit(PREVIEW_CARDS);
      setSelling(data ?? []);
    } else {
      const from = (sellPage - 1) * CARDS_PER_PAGE;
      const to = from + CARDS_PER_PAGE - 1;
      const { data } = await supabase
        .from('cards').select('*')
        .eq('user_id', user.id).eq('active', true).eq('type', 'sell')
        .order('created_at', { ascending: false })
        .range(from, to);
      setSelling(data ?? []);
    }
  }, [user, activeTab, sellPage]);

  const loadWanting = useCallback(async () => {
    if (!user) return;
    if (activeTab === 'view') {
      const { data } = await supabase
        .from('cards').select('*')
        .eq('user_id', user.id).eq('active', true).eq('type', 'want')
        .order('created_at', { ascending: false })
        .limit(PREVIEW_CARDS);
      setWanting(data ?? []);
    } else {
      const from = (wantPage - 1) * CARDS_PER_PAGE;
      const to = from + CARDS_PER_PAGE - 1;
      const { data } = await supabase
        .from('cards').select('*')
        .eq('user_id', user.id).eq('active', true).eq('type', 'want')
        .order('created_at', { ascending: false })
        .range(from, to);
      setWanting(data ?? []);
    }
  }, [user, activeTab, wantPage]);

  // Busca no Supabase quando há texto na busca
  useEffect(() => {
    if (activeTab !== 'manage' || !user || !isSearching) return;
    const search = manageSearch.toLowerCase();
    supabase
      .from('cards').select('*')
      .eq('user_id', user.id).eq('active', true).eq('type', 'sell')
      .or(`name.ilike.%${search}%,set_name.ilike.%${search}%`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSelling(data ?? []));
    supabase
      .from('cards').select('*')
      .eq('user_id', user.id).eq('active', true).eq('type', 'want')
      .or(`name.ilike.%${search}%,set_name.ilike.%${search}%`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setWanting(data ?? []));
  }, [manageSearch, activeTab, user]);

  // Quando busca é limpa, recarrega a página atual
  useEffect(() => {
    if (activeTab !== 'manage' || !user || isSearching) return;
    loadSelling();
    loadWanting();
  }, [isSearching]);

  useEffect(() => {
    if (sellGroups.length === 0 && wantGroups.length === 0) return;
    const initial: Record<string, boolean> = {};
    if (sellGroups[0]) initial[`sell-${sellGroups[0].setId}`] = true;
    if (wantGroups[0]) initial[`want-${wantGroups[0].setId}`] = true;
    setOpenSets(initial);
  }, [sellGroups, wantGroups]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadSelling(); }, [loadSelling]);
  useEffect(() => { loadWanting(); }, [loadWanting]);

  const sellTotalPages = Math.ceil(sellTotal / CARDS_PER_PAGE);
  const wantTotalPages = Math.ceil(wantTotal / CARDS_PER_PAGE);

  const handleRemove = async (id: string, type: 'sell' | 'want') => {
    await supabase.from('cards').update({ active: false }).eq('id', id);

    if (type === 'sell') {
      const newTotal = sellTotal - 1;
      setSellTotal(newTotal);
      const newTotalPages = Math.ceil(newTotal / CARDS_PER_PAGE);
      if (sellPage > newTotalPages && newTotalPages > 0) {
        setSellPage(newTotalPages);
      } else {
        loadSelling();
      }
    } else {
      const newTotal = wantTotal - 1;
      setWantTotal(newTotal);
      const newTotalPages = Math.ceil(newTotal / CARDS_PER_PAGE);
      if (wantPage > newTotalPages && newTotalPages > 0) {
        setWantPage(newTotalPages);
      } else {
        loadWanting();
      }
    }
  }

  const handleEditStart = (card: TradexCard) => {
    setEditingId(card.id);
    setEditValues({
      price: card.price != null ? card.price.toString() : '',
      quantity: card.quantity.toString(),
      condition: card.condition,
      language: card.language,
      type: card.type as 'sell' | 'want',
      variant: card.variant ?? 'normal',
    });
  }

  const handleEditCancel = () => setEditingId(null);

  const handleEditSave = async (card: TradexCard) => {
    const updated = {
      price: editValues.price ? parseFloat(editValues.price) : null,
      quantity: parseInt(editValues.quantity),
      condition: editValues.condition,
      language: editValues.language,
      type: editValues.type,
      variant: editValues.variant,
    };

    await supabase.from('cards').update(updated).eq('id', card.id);

    const typeChanged = editValues.type !== card.type;

    if (typeChanged) {
      // Remove da lista original e insere na lista destino
      if (card.type === 'sell') {
        setSelling(prev => prev.filter(c => c.id !== card.id));
        setSellTotal(prev => prev - 1);
        setWanting(prev => [{ ...card, ...updated }, ...prev]);
        setWantTotal(prev => prev + 1);
      } else {
        setWanting(prev => prev.filter(c => c.id !== card.id));
        setWantTotal(prev => prev - 1);
        setSelling(prev => [{ ...card, ...updated }, ...prev]);
        setSellTotal(prev => prev + 1);
      }
    } else {
      if (card.type === 'sell') {
        setSelling(prev => prev.map(c => c.id === card.id ? { ...c, ...updated } : c));
      } else {
        setWanting(prev => prev.map(c => c.id === card.id ? { ...c, ...updated } : c));
      }
    }

    setEditingId(null);
  }

  const ManageCard = ({ card, type }: { card: TradexCard; type: 'sell' | 'want' }) => (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* DETAILS */}
        <button
          onClick={() => openModal(card, type)}
          className="shrink-0 w-12 rounded overflow-hidden cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
          title="Ver detalhes"
        >
          <img
            src={card.image_url ?? '/back-card-art.webp'}
            alt={card.name_pt ?? card.name}
            className="w-full h-auto object-cover"
          />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#f0f0f0] truncate">{card.name_pt ?? card.name}</p>
          <p className="text-xs text-[#888]">
            #{card.tcg_card_id.split('-').pop()} · {card.set_name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {card.price != null
              ? <p className="text-xs font-bold text-[#f4d03f]">R$ {card.price.toFixed(2)}</p>
              : <p className="text-xs text-[#555]">A negociar</p>
            }
            <p className="text-xs text-[#888]">x{card.quantity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => editingId === card.id ? handleEditCancel() : handleEditStart(card)} className={`transition-colors cursor-pointer ${editingId === card.id ? 'text-[#f4d03f]' : 'text-[#555] hover:text-[#f0f0f0]'}`} title="Editar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => handleRemoveConfirmed(card.id, type)} className="text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer" title="Remover">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {editingId === card.id && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-[#2a2a2a]">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase tracking-wider">Preço</label>
            <input type="number" placeholder="R$" value={editValues.price} onChange={e => setEditValues(prev => ({ ...prev, price: e.target.value }))} min="0" step="0.01" className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase tracking-wider">Qtd</label>
            <input type="number" placeholder="Qtd" value={editValues.quantity} onChange={e => setEditValues(prev => ({ ...prev, quantity: e.target.value }))} min="1" className="w-14 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase tracking-wider">Condição</label>
            <select value={editValues.condition} onChange={e => setEditValues(prev => ({ ...prev, condition: e.target.value }))} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
              {type === 'want' && <option value="ANY">?</option>}
              <option value="M">M</option>
              <option value="NM">NM</option>
              <option value="LP">LP</option>
              <option value="MP">MP</option>
              <option value="HP">HP</option>
              <option value="DMG">DMG</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase tracking-wider">Língua</label>
            <select value={editValues.language} onChange={e => setEditValues(prev => ({ ...prev, language: e.target.value }))} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
              <option value="BR">BR</option>
              <option value="EN">EN</option>
              <option value="JP">JP</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase tracking-wider">Tipo</label>
            <select value={editValues.type} onChange={e => setEditValues(prev => ({ ...prev, type: e.target.value as 'sell' | 'want' }))} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
              <option value="sell">Vendo</option>
              <option value="want">Procuro</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase tracking-wider">Variante</label>
            <select value={editValues.variant} onChange={e => setEditValues(prev => ({ ...prev, variant: e.target.value }))} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer">
              <option value="normal">Normal</option>
              <option value="holo">Holo</option>
              <option value="reverse">Reverse</option>
              <option value="promo">Promo</option>
              <option value="pre_release">Pré-release</option>
              <option value="energy_pattern">Energy Pattern</option>
              <option value="pokeball">Poké Ball</option>
              <option value="masterball">Master Ball</option>
              <option value="cosmos">Cosmos</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-1">
            <div className="flex gap-2">
              <button onClick={() => handleEditSave(card)} className="px-3 py-1 bg-[#e3350d] hover:bg-[#c42d0b] text-white text-xs font-semibold rounded cursor-pointer">Salvar</button>
              <button onClick={handleEditCancel} className="px-3 py-1 text-xs text-[#888] hover:text-[#f0f0f0] cursor-pointer">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Meu inventário</h1>
          <Link to="/search" className="bg-[#e3350d] hover:bg-[#c42d0b] text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors">
            + Adicionar cartas
          </Link>
        </div>

        <div className="border-b border-[#2a2a2a] mb-8">
          <Tabs
            tabs={[
              { id: 'view', label: 'Mostruário' },
              { id: 'manage', label: 'Gerenciar' },
            ]}
            active={activeTab}
            onChange={id => setActiveTab(id as 'view' | 'manage')}
          />
        </div>

        {activeTab === 'view' && (
          <>
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Vendo ({sellTotal})</h2>
                <Link to={`/u/${user?.slug}`} className="text-xs text-[#f4d03f] hover:underline">Ver lista →</Link>
              </div>
              {loadingDashboard ? (
                <p className="text-sm text-[#555]">Carregando...</p>
              ) : selling.length === 0 ? (
                <p className="text-sm text-[#555]">Nenhuma carta adicionada ainda.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selling.map(card => (
                    <CardItem key={card.id} card={card} onOpenModal={c => openModal(c, 'sell')} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Procuro ({wantTotal})</h2>
                <Link to={`/u/${user?.slug}/procuro`} className="text-xs text-[#f4d03f] hover:underline">Ver lista →</Link>
              </div>
              {loadingDashboard ? (
                <p className="text-sm text-[#555]">Carregando...</p>
              ) : wanting.length === 0 ? (
                <p className="text-sm text-[#555]">Nenhuma carta na lista ainda.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {wanting.map(card => (
                    <CardItem key={card.id} card={card} onOpenModal={c => openModal(c, 'want')} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'manage' && (
          <>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Buscar por nome ou set..."
                value={manageSearch}
                onChange={e => setManageSearch(e.target.value)}
                disabled={manageView === 'bySet'}
                className={`flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors ${manageView === 'bySet' ? 'opacity-30 cursor-not-allowed' : ''}`}
              />
              <div className="flex rounded-lg overflow-hidden border border-[#2a2a2a] shrink-0">
                <button
                  onClick={() => setManageView('list')}
                  className={`px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${manageView === 'list' ? 'bg-[#e3350d] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-[#f0f0f0]'}`}
                >
                  Lista
                </button>
                <button
                  onClick={() => setManageView('bySet')}
                  className={`px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${manageView === 'bySet' ? 'bg-[#e3350d] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-[#f0f0f0]'}`}
                >
                  Por set
                </button>
              </div>
            </div>

            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Vendo ({sellTotal})</h2>
                {selling.length > 0 && (
                  <button onClick={() => handleRemoveAll('sell')} className="text-xs text-[#e3350d] hover:text-[#f0f0f0] transition-colors cursor-pointer">
                    Remover todas
                  </button>
                )}
              </div>
              {loadingDashboard ? (
                <p className="text-sm text-[#555]">Carregando...</p>
              ) : selling.length === 0 ? (
                <p className="text-sm text-[#555]">{isSearching ? 'Nenhuma carta encontrada.' : 'Nenhuma carta adicionada ainda.'}</p>
              ) : manageView === 'bySet' ? (
                loadingSellGroups ? (
                  <p className="text-sm text-[#555]">Carregando...</p>
                ) : sellGroups.length === 0 ? (
                  <p className="text-sm text-[#555]">Nenhuma carta adicionada ainda.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sellGroups.map(group => {
                      const key = `sell-${group.setId}`;
                      const isOpen = openSets[key] ?? false;
                      return (
                        <div key={key} className="border border-[#2a2a2a] rounded-xl overflow-hidden">
                          <button
                            onClick={() => setOpenSets(prev => ({ ...prev, [key]: !isOpen }))}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] transition-colors cursor-pointer"
                          >
                            <SetLogo logoUrl={group.logoUrl} name={group.setName} className="h-7 w-20" />
                            <span className="flex-1 text-left text-sm font-semibold text-[#f0f0f0] truncate">{group.setName}</span>
                            <span className="text-xs text-[#555]">{group.cards.length} carta{group.cards.length !== 1 ? 's' : ''}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#555] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="flex flex-col gap-2 p-3 bg-[#0f0f0f]">
                              {group.cards.map(card => <ManageCard key={card.id} card={card} type="sell" />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {selling.map(card => <ManageCard key={card.id} card={card} type="sell" />)}
                  </div>
                  {!isSearching && <Pagination current={sellPage} total={sellTotalPages} onChange={setSellPage} />}
                </>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Procuro ({wantTotal})</h2>
                {wanting.length > 0 && (
                  <button onClick={() => handleRemoveAll('want')} className="text-xs text-[#e3350d] hover:text-[#f0f0f0] transition-colors cursor-pointer">
                    Remover todas
                  </button>
                )}
              </div>
              {loadingDashboard ? (
                <p className="text-sm text-[#555]">Carregando...</p>
              ) : wanting.length === 0 ? (
                <p className="text-sm text-[#555]">{isSearching ? 'Nenhuma carta encontrada.' : 'Nenhuma carta na lista ainda.'}</p>
              ) : manageView === 'bySet' ? (
                loadingWantGroups ? (
                  <p className="text-sm text-[#555]">Carregando...</p>
                ) : wantGroups.length === 0 ? (
                  <p className="text-sm text-[#555]">Nenhuma carta na lista ainda.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {wantGroups.map(group => {
                      const key = `want-${group.setId}`;
                      const isOpen = openSets[key] ?? false;
                      return (
                        <div key={key} className="border border-[#2a2a2a] rounded-xl overflow-hidden">
                          <button
                            onClick={() => setOpenSets(prev => ({ ...prev, [key]: !isOpen }))}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] transition-colors cursor-pointer"
                          >
                            <SetLogo logoUrl={group.logoUrl} name={group.setName} className="h-7 w-20" />
                            <span className="flex-1 text-left text-sm font-semibold text-[#f0f0f0] truncate">{group.setName}</span>
                            <span className="text-xs text-[#555]">{group.cards.length} carta{group.cards.length !== 1 ? 's' : ''}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#555] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="flex flex-col gap-2 p-3 bg-[#0f0f0f]">
                              {group.cards.map(card => <ManageCard key={card.id} card={card} type="want" />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {wanting.map(card => <ManageCard key={card.id} card={card} type="want" />)}
                  </div>
                  {!isSearching && <Pagination current={wantPage} total={wantTotalPages} onChange={setWantPage} />}
                </>
              )}
            </section>
          </>
        )}
      </main>

      {modalList !== null && (
        <CardModal
          cards={modalList === 'sell' ? selling : wanting}
          currentIndex={modalIndex}
          onIndexChange={setModalIndex}
          onClose={() => setModalList(null)}
          sets={sets}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeDialog}
      />
    </div>
  )
}

export default Dashboard
