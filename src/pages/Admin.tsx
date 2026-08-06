import { useEffect, useState, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import Tabs from '../components/ui/Tabs'
import SetLogo from '../components/ui/SetLogo'
import Navbar from '../components/layout/Navbar'
import { invalidateSetCache } from '../hooks/usePokemonSearch'

interface SerieItem {
  id: string,
  name: string,
  name_pt: string | null,
  order_index: number | null,
  created_at: string,
}

interface SetItem {
  id: string,
  name: string,
  serie: string,
  serie_id: string | null,
  ptcgo_code: string | null,
  release_date: string | null,
  total: number | null,
  official_count: number | null,
  logo_url: string | null,
  logo_url_pt: string | null,
  symbol_url: string | null,
  order_index: number | null,
  enabled: boolean,
}

interface UserItem {
  id: string,
  name: string,
  phone: string,
  email: string,
  slug: string,
  role: string,
  created_at: string
}

interface SyncResult {
  updated: number,
  inserted: number,
  error: string | null,
}

const Admin = () => {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sets, setSets] = useState<SetItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [activeTab, setActiveTab] = useState('collections');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SetItem>>({});
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const [series, setSeries] = useState<SerieItem[]>([]);
  const [editingSerieId, setEditingSerieId] = useState<string | null>(null);
  const [editSerieValues, setEditSerieValues] = useState<Partial<SerieItem>>({});
  const [newSerie, setNewSerie] = useState({ id: '', name: '', name_pt: '', order_index: '' });
  const [addingNewSerie, setAddingNewSerie] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeTab === 'collections') {
      Promise.all([
        supabase.from('sets').select('*').order('order_index', { ascending: true, nullsFirst: false }),
        supabase.from('series').select('*').order('order_index', { ascending: true, nullsFirst: false }),
      ]).then(([{ data: setsData }, { data: seriesData }]) => {
        setSets(setsData ?? []);
        setSeries(seriesData ?? []);
        setLoading(false);
        const sorted = [...(seriesData ?? [])].sort((a, b) => (b.order_index ?? -1) - (a.order_index ?? -1));
        if (sorted.length > 0) setExpandedSeries(new Set([sorted[0].id]));
      });
    } else {
      supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setUsers(data ?? []);
          setLoading(false);
        });
    }
    setLoading(true);
    setSearch('');
    setEditingId(null);
    setSyncResult(null);
  }, [activeTab]);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditSet = (set: SetItem) => {
    setEditingId(set.id);
    setEditValues({
      serie: set.serie,
      ptcgo_code: set.ptcgo_code ?? '',
      release_date: set.release_date ?? '',
      order_index: set.order_index,
      logo_url: set.logo_url ?? '',
      logo_url_pt: set.logo_url_pt ?? '',
      symbol_url: set.symbol_url ?? '',
    });
  };

  const handleSaveSet = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('sets')
      .update({
        serie: editValues.serie,
        ptcgo_code: editValues.ptcgo_code || null,
        release_date: editValues.release_date || null,
        order_index: editValues.order_index ?? null,
        logo_url: editValues.logo_url || null,
        logo_url_pt: editValues.logo_url_pt || null,
        symbol_url: editValues.symbol_url || null,
      })
      .eq('id', id);

    if (!error) {
      setSets(prev => prev.map(s => s.id === id ? { ...s, ...editValues } : s));
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleDeleteSet = async (id: string) => {
    if (!confirm(`Deletar expansão "${id}"?`)) return;
    const { error } = await supabase.from('sets').delete().eq('id', id);
    if (!error) {
      setSets(prev => prev.filter(s => s.id !== id));
      invalidateSetCache();
    }
  };

  const handleToggleEnabled = async (set: SetItem) => {
    const { error } = await supabase
      .from('sets')
      .update({ enabled: !set.enabled })
      .eq('id', set.id);

    if (!error) setSets(prev => prev.map(s => s.id === set.id ? { ...s, enabled: !s.enabled } : s));
  }

  const handleUploadAsset = async (setId: string, field: 'logo_url' | 'logo_url_pt' | 'symbol_url', file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${setId}/${field}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('set-assets')
      .upload(path, file, { upsert: true });
    if (uploadError) return;
    const { data } = supabase.storage.from('set-assets').getPublicUrl(path);
    setEditValues(prev => ({ ...prev, [field]: data.publicUrl }));
  };

  const handleToggleRole = async (user: UserItem) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Alterar role de "${user.name}" para ${newRole}?`)) return;
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    if (!error) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
  };

  const handleSyncSets = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('https://api.tcgdex.net/v2/en/sets?pagination:itemsPerPage=500');
      const data: Array<{
        id: string,
        name: string,
        logo?: string,
        cardCount?: { total?: number, official?: number },
      }> = await res.json();

      const existingIds = new Set(sets.map(s => s.id));

      const seen = new Set<string>();
      const deduped = data.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      const toInsert = deduped
        .filter(s => !existingIds.has(s.id))
        .map(s => ({
          id: s.id,
          name: s.name,
          serie: 'Other',
          logo_url: s.logo ? `${s.logo}.webp` : null,
          total: s.cardCount?.total ?? null,
          official_count: s.cardCount?.official ?? null,
        }));

      const toUpdate = deduped
        .filter(s => existingIds.has(s.id))
        .map(s => {
          const existing = sets.find(e => e.id === s.id);
          return {
            id: s.id,
            name: s.name,
            serie: existing?.serie ?? 'Other',
            logo_url: s.logo ? `${s.logo}.webp` : null,
            total: s.cardCount?.total ?? null,
            official_count: s.cardCount?.official ?? null,
          };
        });

      const insertResult = toInsert.length > 0
        ? await supabase.from('sets').insert(toInsert)
        : { error: null as null };

      if (insertResult?.error) throw new Error(insertResult.error.message);

      let updateError: string | null = null;
      for (const s of toUpdate) {
        const { error } = await supabase
          .from('sets')
          .update({
            name: s.name,
            serie: s.serie,
            logo_url: s.logo_url,
            total: s.total,
            official_count: s.official_count,
          })
          .eq('id', s.id);
        if (error) { updateError = error.message; break; }
      }

      if (updateError) throw new Error(updateError);

      const { data: refreshed } = await supabase
        .from('sets')
        .select('*')
        .order('release_date', { ascending: false, nullsFirst: false });

      setSets(refreshed ?? []);
      invalidateSetCache();
      setSyncResult({ inserted: toInsert.length, updated: toUpdate.length, error: null });
    } catch (err) {
      setSyncResult({ inserted: 0, updated: 0, error: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const handleEditSerie = (serie: SerieItem) => {
    setEditingSerieId(serie.id);
    setEditSerieValues({ name: serie.name, name_pt: serie.name_pt ?? '', order_index: serie.order_index });
  };

  const handleSaveSerie = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('series')
      .update({
        name: editSerieValues.name,
        name_pt: editSerieValues.name_pt || null,
        order_index: editSerieValues.order_index ?? null,
      })
      .eq('id', id);

    if (!error) {
      setSeries(prev => prev.map(s => s.id === id ? { ...s, ...editSerieValues } : s));
      setEditingSerieId(null);
    }
    setSaving(false);
  };

  const handleAddSerie = async () => {
    if (!newSerie.id.trim() || !newSerie.name.trim()) return;
    setAddingNewSerie(true);
    const { error } = await supabase
      .from('series')
      .insert({
        id: newSerie.id.trim(),
        name: newSerie.name.trim(),
        name_pt: newSerie.name_pt.trim() || null,
        order_index: newSerie.order_index ? parseInt(newSerie.order_index) : null,
      });

    if (!error) {
      const { data } = await supabase.from('series').select('*').order('order_index', { ascending: true, nullsFirst: false });
      setSeries(data ?? []);
      setNewSerie({ id: '', name: '', name_pt: '', order_index: '' });
    }
    setAddingNewSerie(false);
  };

  const handleDeleteSerie = async (id: string) => {
    if (!confirm(`Deletar série "${id}"? Os sets associados ficarão sem série.`)) return;
    const { error } = await supabase.from('series').delete().eq('id', id);
    if (!error) setSeries(prev => prev.filter(s => s.id !== id));
  };

  const toggleExpandSerie = (id: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>

        <Tabs
          tabs={[
            { id: 'collections', label: 'Coleções' },
            { id: 'users', label: `Usuários (${users.length})` },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            placeholder={activeTab === 'collections' ? 'Buscar por nome, ID ou série...' : 'Buscar por nome, email ou apelido...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
          />
          {activeTab === 'collections' && (
            <button
              onClick={handleSyncSets}
              disabled={syncing}
              className="shrink-0 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e3350d] text-sm text-[#f0f0f0] px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className={syncing ? 'animate-spin' : ''}>↻</span>
              <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizar sets'}</span>
            </button>
          )}
        </div>

        {syncResult && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${syncResult.error ? 'bg-[#e3350d]/10 border-[#e3350d]/30 text-[#e3350d]' : 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'}`}>
            {syncResult.error
              ? `Erro na sincronização: ${syncResult.error}`
              : `Sincronização concluída — ${syncResult.inserted} novo${syncResult.inserted !== 1 ? 's' : ''}, ${syncResult.updated} atualizado${syncResult.updated !== 1 ? 's' : ''}.`
            }
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#555]">Carregando...</p>
        ) : activeTab === 'collections' ? (
          <div className="flex flex-col gap-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Nova Série</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-[#555] mb-1 block">ID</label>
                  <input
                    value={newSerie.id}
                    onChange={e => setNewSerie(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="ex: scarlet-violet"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Nome</label>
                  <input
                    value={newSerie.name}
                    onChange={e => setNewSerie(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: Scarlet & Violet"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Nome (BR)</label>
                  <input
                    value={newSerie.name_pt}
                    onChange={e => setNewSerie(prev => ({ ...prev, name_pt: e.target.value }))}
                    placeholder="ex: Escarlate e Violeta"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Ordem</label>
                  <input
                    value={newSerie.order_index}
                    onChange={e => setNewSerie(prev => ({ ...prev, order_index: e.target.value }))}
                    placeholder="ex: 1"
                    type="number"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                  />
                </div>
              </div>
              <button
                onClick={handleAddSerie}
                disabled={addingNewSerie || !newSerie.id.trim() || !newSerie.name.trim()}
                className="mt-3 bg-[#e3350d] hover:bg-[#c42d0b] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {addingNewSerie ? 'Adicionando...' : 'Adicionar série'}
              </button>
            </div>

            {/* Lista de séries com sets */}
            {[...series].sort((a, b) => (b.order_index ?? -1) - (a.order_index ?? -1)).map(serie => {
              const serieSets = sets
                .filter(s => s.serie_id === serie.id)
                .sort((a, b) => {
                  if (a.order_index == null && b.order_index == null) return 0;
                  if (a.order_index == null) return 1;
                  if (b.order_index == null) return -1;
                  return b.order_index - a.order_index;
                });
              const isExpanded = expandedSeries.has(serie.id);

              return (
                <div key={serie.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                  <div
                    onClick={() => toggleExpandSerie(serie.id)}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#222] transition-colors select-none"
                  >
                    <span className="text-[#555] text-lg leading-none">
                      {isExpanded ? '▾' : '▸'}
                    </span>
                    <div className="flex-1">
                      {editingSerieId === serie.id ? (
                        <div className="flex flex-wrap items-center gap-4" onClick={e => e.stopPropagation()}>
                          <div>
                            <label className="text-xs text-[#555] mb-1 block">Nome</label>
                            <input
                              value={editSerieValues.name ?? ''}
                              onChange={e => setEditSerieValues(prev => ({ ...prev, name: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveSerie(serie.id); }}
                              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] w-40"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#555] mb-1 block">Nome (BR)</label>
                            <input
                              value={editSerieValues.name_pt ?? ''}
                              onChange={e => setEditSerieValues(prev => ({ ...prev, name_pt: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveSerie(serie.id); }}
                              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] w-40"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#555] mb-1 block">Ordem</label>
                            <input
                              value={editSerieValues.order_index ?? ''}
                              onChange={e => setEditSerieValues(prev => ({ ...prev, order_index: e.target.value ? parseInt(e.target.value) : null }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveSerie(serie.id); }}
                              type="number"
                              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#e3350d] w-20"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#f0f0f0]">{serie.name}</span>
                            {serie.order_index != null && <span className="text-xs text-[#333] font-mono">#{serie.order_index}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {serie.name_pt && <span className="text-xs text-[#555]">({serie.name_pt})</span>}
                            <span className="text-xs text-[#444]">{serieSets.length} set{serieSets.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {editingSerieId === serie.id ? (
                        <>
                          <button onClick={() => handleSaveSerie(serie.id)} disabled={saving} className="text-[#22c55e] hover:text-white transition-colors cursor-pointer">✓</button>
                          <button onClick={() => setEditingSerieId(null)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer">✕</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditSerie(serie)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer">✏️</button>
                          <button onClick={() => handleDeleteSerie(serie.id)} className="text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* SERIES' SETS */}
                  {isExpanded && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2a2a2a] text-[#888] text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3">Expansão</th>
                          <th className="text-left px-4 py-3 hidden sm:table-cell">PTCGO</th>
                          <th className="text-left px-4 py-3 hidden md:table-cell">Lançamento</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {serieSets.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-xs text-[#444]">Nenhuma expansão nesta série</td>
                          </tr>
                        ) : serieSets.map(set => (
                          <Fragment key={set.id}>
                            <tr className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#222] transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0">
                                    <SetLogo logoUrl={set.logo_url} name={set.name} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[#f0f0f0] font-medium">{set.name}</p>
                                      {set.order_index != null && <span className="text-xs text-[#333] font-mono">#{set.order_index}</span>}
                                    </div>
                                    <p className="text-xs text-[#555] font-mono">{set.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                {editingId === set.id ? (
                                  <input
                                    value={editValues.ptcgo_code ?? ''}
                                    onChange={e => setEditValues(prev => ({ ...prev, ptcgo_code: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSet(set.id); }}
                                    className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                                  />
                                ) : (
                                  <span className="text-[#888] text-xs">{set.ptcgo_code ?? '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                {editingId === set.id ? (
                                  <input
                                    value={(() => {
                                      const d = editValues.release_date ?? '';
                                      const parts = d.split('/');
                                      if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                      return d;
                                    })()}
                                    onChange={e => {
                                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                      let masked = digits;
                                      if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                                      else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                                      const parts = masked.split('/');
                                      const stored = parts.length === 3 && parts[2].length === 4
                                        ? `${parts[2]}/${parts[1]}/${parts[0]}`
                                        : masked;
                                      setEditValues(prev => ({ ...prev, release_date: stored }));
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSet(set.id); }}
                                    placeholder="DD/MM/YYYY"
                                    autoFocus
                                    onFocus={e => e.target.select()}
                                    className="w-28 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                                  />
                                ) : (
                                  <span className="text-[#888] text-xs">
                                    {set.release_date ? set.release_date.split('/').reverse().join('/') : '—'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    onClick={() => handleToggleEnabled(set)}
                                    title={set.enabled ? 'Desabilitar' : 'Habilitar'}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${set.enabled ? 'bg-[#22c55e]' : 'bg-[#2a2a2a]'}`}
                                  >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${set.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </button>
                                  {editingId === set.id ? (
                                    <>
                                      <button onClick={() => handleSaveSet(set.id)} disabled={saving} className="text-[#22c55e] hover:text-white transition-colors cursor-pointer">✓</button>
                                      <button onClick={() => setEditingId(null)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer">✕</button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => handleEditSet(set)} className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer">✏️</button>
                                      <button onClick={() => handleDeleteSet(set.id)} className="text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer">🗑️</button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {editingId === set.id && (
                              <tr className="border-b border-[#2a2a2a] bg-[#111]">
                                <td colSpan={4} className="px-4 py-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

                                    {/* ORDER */}
                                    <div>
                                      <label className="text-xs text-[#555] mb-1 block">Ordem</label>
                                      <input
                                        value={editValues.order_index ?? ''}
                                        onChange={e => setEditValues(prev => ({ ...prev, order_index: e.target.value ? parseInt(e.target.value) : null }))}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveSet(set.id); }}
                                        type="number"
                                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                                      />
                                    </div>

                                    {/* PTCGO */}
                                    <div className="sm:hidden">
                                      <label className="text-xs text-[#555] mb-1 block">PTCGO</label>
                                      <input
                                        value={editValues.ptcgo_code ?? ''}
                                        onChange={e => setEditValues(prev => ({ ...prev, ptcgo_code: e.target.value }))}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveSet(set.id); }}
                                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                                      />
                                    </div>

                                    {/* RELEASE */}
                                    <div className="md:hidden">
                                      <label className="text-xs text-[#555] mb-1 block">Lançamento</label>
                                      <input
                                        value={(() => {
                                          const d = editValues.release_date ?? '';
                                          const parts = d.split('/');
                                          if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                          return d;
                                        })()}
                                        onChange={e => {
                                          const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                          let masked = digits;
                                          if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                                          else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                                          const parts = masked.split('/');
                                          const stored = parts.length === 3 && parts[2].length === 4
                                            ? `${parts[2]}/${parts[1]}/${parts[0]}`
                                            : masked;
                                          setEditValues(prev => ({ ...prev, release_date: stored }));
                                        }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveSet(set.id); }}
                                        placeholder="DD/MM/YYYY"
                                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                                      />
                                    </div>

                                    {/* LOGO */}
                                    <div>
                                      <label className="text-xs text-[#555] mb-1 block">Logo</label>
                                      {editValues.logo_url && (
                                        <img src={editValues.logo_url} alt="logo EN" className="h-8 mb-2 opacity-80" />
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => { if (e.target.files?.[0]) handleUploadAsset(set.id, 'logo_url', e.target.files[0]); }}
                                        className="w-full text-xs text-[#888] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#2a2a2a] file:text-[#f0f0f0] file:cursor-pointer"
                                      />
                                    </div>

                                    {/* LOGO BR */}
                                    <div>
                                      <label className="text-xs text-[#555] mb-1 block">Logo (BR)</label>
                                      {editValues.logo_url_pt && (
                                        <img src={editValues.logo_url_pt} alt="logo PT" className="h-8 mb-2 opacity-80" />
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => { if (e.target.files?.[0]) handleUploadAsset(set.id, 'logo_url_pt', e.target.files[0]); }}
                                        className="w-full text-xs text-[#888] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#2a2a2a] file:text-[#f0f0f0] file:cursor-pointer"
                                      />
                                    </div>

                                    {/* SYMBOL */}
                                    <div>
                                      <label className="text-xs text-[#555] mb-1 block">Símbolo</label>
                                      {editValues.symbol_url && (
                                        <img src={editValues.symbol_url} alt="símbolo" className="h-8 mb-2 opacity-80" />
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => { if (e.target.files?.[0]) handleUploadAsset(set.id, 'symbol_url', e.target.files[0]); }}
                                        className="w-full text-xs text-[#888] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#2a2a2a] file:text-[#f0f0f0] file:cursor-pointer"
                                      />
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-[#888] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Apelido</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#222] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[#f0f0f0] font-medium">{user.name}</p>
                      <p className="text-xs text-[#555]">{user.phone}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[#888] text-xs">{user.email}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[#888] text-xs">{user.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${user.role === 'admin' ? 'bg-[#e3350d]/20 text-[#e3350d]' : 'bg-[#2a2a2a] text-[#888]'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleRole(user)}
                          title={user.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                          className="text-[#555] hover:text-[#f4d03f] transition-colors cursor-pointer"
                        >
                          👑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

export default Admin
