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

const CARDS_PER_PAGE = 12;

const Dashboard = () => {
  const { user } = useAuth();

  const [sellPage, setSellPage] = useState(1);
  const [wantPage, setWantPage] = useState(1);
  const [sellTotal, setSellTotal] = useState(0);
  const [wantTotal, setWantTotal] = useState(0);
  const [selling, setSelling] = useState<TradexCard[]>([]);
  const [wanting, setWanting] = useState<TradexCard[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<TradexCard | null>(null);
  const [activeTab, setActiveTab] = useState<'view' | 'manage'>('view');
  const [editValues, setEditValues] = useState<{ price: string; quantity: string; condition: string; language: string }>({
    price: '', quantity: '1', condition: 'NM', language: 'BR'
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } >({ open: false, title: '', onConfirm: () => {} });

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
  }, [user])

  const loadSelling = useCallback(async () => {
    if (!user) return;
    const from = (sellPage - 1) * CARDS_PER_PAGE;
    const to = from + CARDS_PER_PAGE - 1;
    const { data } = await supabase
      .from('cards').select('*')
      .eq('user_id', user.id).eq('active', true).eq('type', 'sell')
      .range(from, to);
    setSelling(data ?? []);
  }, [user, sellPage])

  const loadWanting = useCallback(async () => {
    if (!user) return;
    const from = (wantPage - 1) * CARDS_PER_PAGE;
    const to = from + CARDS_PER_PAGE - 1;
    const { data } = await supabase
      .from('cards').select('*')
      .eq('user_id', user.id).eq('active', true).eq('type', 'want')
      .range(from, to);
    setWanting(data ?? []);
  }, [user, wantPage])

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
      language: card.language
    });
  }

  const handleEditCancel = () => {
    setEditingId(null);
  }

  const handleEditSave = async (card: TradexCard) => {
    await supabase.from('cards').update({
      price: editValues.price ? parseFloat(editValues.price) : null,
      quantity: parseInt(editValues.quantity),
      condition: editValues.condition,
      language: editValues.language,
    }).eq('id', card.id);

    if (card.type === 'sell') {
      setSelling(prev => prev.map(c => c.id === card.id ? {
        ...c,
        price: editValues.price ? parseFloat(editValues.price) : null,
        quantity: parseInt(editValues.quantity),
        condition: editValues.condition,
        language: editValues.language,
      } : c));
    } else {
      setWanting(prev => prev.map(c => c.id === card.id ? {
        ...c,
        price: editValues.price ? parseFloat(editValues.price) : null,
        quantity: parseInt(editValues.quantity),
        condition: editValues.condition,
        language: editValues.language,
      } : c));
    }

    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Meu inventário</h1>
          <Link
            to="/search"
            className="bg-[#e3350d] hover:bg-[#c42d0b] text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
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
            {/* Vendo */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
                  Vendo ({sellTotal})
                </h2>
                <Link to={`/u/${user?.slug}`} className="text-xs text-[#f4d03f] hover:underline">
                  Ver lista →
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
                      />
                    ))}
                  </div>
                  <Pagination current={sellPage} total={sellTotalPages} onChange={setSellPage} />
                </>
              )}
            </section>

            {/* Procuro */}
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
                      />
                    ))}
                  </div>
                  <Pagination current={wantPage} total={wantTotalPages} onChange={setWantPage} />
                </>
              )}
            </section>
          </>
        )}

        {activeTab === 'manage' && (
          <>
            {/* Vendo */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
                  Vendo ({sellTotal})
                </h2>
                {selling.length > 0 && (
                  <button
                    onClick={() => handleRemoveAll('sell')}
                    className="text-xs text-[#e3350d] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                  >
                    Remover todas
                  </button>
                )}
              </div>
              {loadingDashboard ? (
                <p className="text-sm text-[#555]">Carregando...</p>
              ) : selling.length === 0 ? (
                <p className="text-sm text-[#555]">Nenhuma carta adicionada ainda.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {selling.map(card => (
                      <div key={card.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#f0f0f0] truncate">{card.name}</p>
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

                          {/* Ícones */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setModalCard(card)}
                              className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                              title="Ver detalhes"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => editingId === card.id ? handleEditCancel() : handleEditStart(card)}
                              className={`transition-colors cursor-pointer ${editingId === card.id ? 'text-[#f4d03f]' : 'text-[#555] hover:text-[#f0f0f0]'}`}
                              title="Editar"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveConfirmed(card.id, 'sell')}
                              className="text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
                              title="Remover"
                            >
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
                              <input
                                type="number"
                                placeholder="R$"
                                value={editValues.price}
                                onChange={e => setEditValues(prev => ({ ...prev, price: e.target.value }))}
                                min="0"
                                step="0.01"
                                className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-[#555] uppercase tracking-wider">Qtd</label>
                              <input
                                type="number"
                                placeholder="Qtd"
                                value={editValues.quantity}
                                onChange={e => setEditValues(prev => ({ ...prev, quantity: e.target.value }))}
                                min="1"
                                className="w-14 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-[#555] uppercase tracking-wider">Condição</label>
                              <select
                                value={editValues.condition}
                                onChange={e => setEditValues(prev => ({ ...prev, condition: e.target.value }))}
                                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                              >
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
                              <select
                                value={editValues.language}
                                onChange={e => setEditValues(prev => ({ ...prev, language: e.target.value }))}
                                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                              >
                                <option value="BR">BR</option>
                                <option value="EN">EN</option>
                                <option value="JP">JP</option>
                              </select>
                            </div>
                            <div className="flex flex-col justify-end gap-1">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSave(card)}
                                  className="px-3 py-1 bg-[#e3350d] hover:bg-[#c42d0b] text-white text-xs font-semibold rounded cursor-pointer"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={handleEditCancel}
                                  className="px-3 py-1 text-xs text-[#888] hover:text-[#f0f0f0] cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Pagination current={sellPage} total={sellTotalPages} onChange={setSellPage} />
                </>
              )}
            </section>

            {/* Procuro */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
                  Procuro ({wantTotal})
                </h2>
                {wanting.length > 0 && (
                  <button
                    onClick={() => handleRemoveAll('want')}
                    className="text-xs text-[#e3350d] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                  >
                    Remover todas
                  </button>
                )}
              </div>
              {loadingDashboard ? (
                <p className="text-sm text-[#555]">Carregando...</p>
              ) : wanting.length === 0 ? (
                <p className="text-sm text-[#555]">Nenhuma carta na lista ainda.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {wanting.map(card => (
                      <div key={card.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#f0f0f0] truncate">{card.name}</p>
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

                          {/* Ícones */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setModalCard(card)}
                              className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                              title="Ver detalhes"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => editingId === card.id ? handleEditCancel() : handleEditStart(card)}
                              className={`transition-colors cursor-pointer ${editingId === card.id ? 'text-[#f4d03f]' : 'text-[#555] hover:text-[#f0f0f0]'}`}
                              title="Editar"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveConfirmed(card.id, 'want')}
                              className="text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
                              title="Remover"
                            >
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
                              <input
                                type="number"
                                placeholder="R$"
                                value={editValues.price}
                                onChange={e => setEditValues(prev => ({ ...prev, price: e.target.value }))}
                                min="0"
                                step="0.01"
                                className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-[#555] uppercase tracking-wider">Qtd</label>
                              <input
                                type="number"
                                placeholder="Qtd"
                                value={editValues.quantity}
                                onChange={e => setEditValues(prev => ({ ...prev, quantity: e.target.value }))}
                                min="1"
                                className="w-14 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d]"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-[#555] uppercase tracking-wider">Condição</label>
                              <select
                                value={editValues.condition}
                                onChange={e => setEditValues(prev => ({ ...prev, condition: e.target.value }))}
                                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                              >
                                <option value="ANY">?</option>
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
                              <select
                                value={editValues.language}
                                onChange={e => setEditValues(prev => ({ ...prev, language: e.target.value }))}
                                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] cursor-pointer"
                              >
                                <option value="BR">BR</option>
                                <option value="EN">EN</option>
                                <option value="JP">JP</option>
                              </select>
                            </div>
                            <div className="flex flex-col justify-end gap-1">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSave(card)}
                                  className="px-3 py-1 bg-[#e3350d] hover:bg-[#c42d0b] text-white text-xs font-semibold rounded cursor-pointer"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={handleEditCancel}
                                  className="px-3 py-1 text-xs text-[#888] hover:text-[#f0f0f0] cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Pagination current={wantPage} total={wantTotalPages} onChange={setWantPage} />
                </>
              )}
            </section>
          </>
        )}
      </main>

      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeDialog}
        />
    </div>
  );
};

export default Dashboard
