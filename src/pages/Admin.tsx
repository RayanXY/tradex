import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { invalidateSetCache } from '../hooks/usePokemonSearch';

interface SetItem {
  id: string,
  name: string,
  serie: string,
  ptcgo_code: string | null,
  release_date: string | null,
  total: number | null
}

const Admin = () => {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<SetItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SetItem>>({});

  useEffect(() => {
    supabase
      .from('sets')
      .select('*')
      .order('release_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setSets(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = sets.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    (s.serie ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (set: SetItem) => {
    setEditingId(set.id);
    setEditValues({ serie: set.serie, ptcgo_code: set.ptcgo_code ?? '', release_date: set.release_date ?? '' });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('sets')
      .update({
        serie: editValues.serie,
        ptcgo_code: editValues.ptcgo_code || null,
        release_date: editValues.release_date || null,
      })
      .eq('id', id);

    if (!error) {
      setSets(prev => prev.map(s => s.id === id ? { ...s, ...editValues } : s));
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Deletar set "${id}"?`)) return;
    const { error } = await supabase.from('sets').delete().eq('id', id);
    if (!error) {
      setSets(prev => prev.filter(s => s.id !== id));
      invalidateSetCache();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin — Sets</h1>
          <span className="text-sm text-[#555]">{sets.length} sets</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por nome, ID ou série..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors mb-6"
        />

        {loading ? (
          <p className="text-sm text-[#555]">Carregando...</p>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-[#888] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Série</th>
                  <th className="text-left px-4 py-3">PTCGO</th>
                  <th className="text-left px-4 py-3">Release</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(set => (
                  <tr key={set.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#222] transition-colors">
                    <td className="px-4 py-3 text-[#555] font-mono text-xs">{set.id}</td>
                    <td className="px-4 py-3 text-[#f0f0f0]">{set.name}</td>
                    <td className="px-4 py-3">
                      {editingId === set.id ? (
                        <input
                          value={editValues.serie ?? ''}
                          onChange={e => setEditValues(prev => ({ ...prev, serie: e.target.value }))}
                          className="w-36 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                        />
                      ) : (
                        <span className="text-[#888]">{set.serie}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === set.id ? (
                        <input
                          value={editValues.ptcgo_code ?? ''}
                          onChange={e => setEditValues(prev => ({ ...prev, ptcgo_code: e.target.value }))}
                          className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                        />
                      ) : (
                        <span className="text-[#888]">{set.ptcgo_code ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === set.id ? (
                        <input
                          value={editValues.release_date ?? ''}
                          onChange={e => setEditValues(prev => ({ ...prev, release_date: e.target.value }))}
                          placeholder="YYYY/MM/DD"
                          className="w-28 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                        />
                      ) : (
                        <span className="text-[#888]">{set.release_date ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === set.id ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleSave(set.id)}
                            disabled={saving}
                            className="text-xs text-[#22c55e] hover:text-white transition-colors cursor-pointer"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(set)}
                            className="text-xs text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(set.id)}
                            className="text-xs text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
                          >
                            Deletar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin
