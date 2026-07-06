import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Tabs from '../components/Tabs'

interface SetItem {
  id: string,
  name: string,
  serie: string,
  ptcgo_code: string | null,
  release_date: string | null,
  total: number | null,
  logo_url: string | null
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

const Admin = () => {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<SetItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [activeTab, setActiveTab] = useState('sets');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SetItem>>({});

  useEffect(() => {
    if (activeTab === 'sets') {
      supabase
        .from('sets')
        .select('*')
        .order('release_date', { ascending: false, nullsFirst: false })
        .then(({ data }) => {
          setSets(data ?? []);
          setLoading(false);
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
  }, [activeTab]);

  const seriesWithDate = [...new Set(
    sets.filter(s => s.release_date)
      .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
      .map(s => s.serie)
  )];
  const seriesWithoutDate = [...new Set(
    sets.filter(s => !s.release_date).map(s => s.serie)
  )].filter(s => !seriesWithDate.includes(s));
  const seriesOrder = [...seriesWithDate, ...seriesWithoutDate]
    .filter(s => s !== 'Other');
  seriesOrder.push('Other');

  const filteredSets = sets.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    (s.serie ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const sortedSets = search ? filteredSets : seriesOrder.flatMap(serie =>
    sets
      .filter(s => s.serie === serie)
      .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditSet = (set: SetItem) => {
    setEditingId(set.id);
    setEditValues({ serie: set.serie, ptcgo_code: set.ptcgo_code ?? '', release_date: set.release_date ?? '' });
  };

  const handleSaveSet = async (id: string) => {
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

  const handleDeleteSet = async (id: string) => {
    if (!confirm(`Deletar set "${id}"?`)) return;
    const { error } = await supabase.from('sets').delete().eq('id', id);
    if (!error) setSets(prev => prev.filter(s => s.id !== id));
  };

  const handleToggleRole = async (user: UserItem) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Alterar role de "${user.name}" para ${newRole}?`)) return;
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    if (!error) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
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
            { id: 'sets', label: `Sets (${sets.length})` },
            { id: 'users', label: `Usuários (${users.length})` },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        <input
          type="text"
          placeholder={activeTab === 'sets' ? 'Buscar por nome, ID ou série...' : 'Buscar por nome, email ou apelido...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors mb-6"
        />

        {loading ? (
          <p className="text-sm text-[#555]">Carregando...</p>
        ) : activeTab === 'sets' ? (

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-[#888] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Set</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Série</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">PTCGO</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Release</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedSets.map(set => (
                  <tr key={set.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#222] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {set.logo_url ? (
                          <img src={set.logo_url} alt={set.name} className="h-8 w-20 object-contain" />
                        ) : (
                          <div className="h-8 w-20 bg-[#2a2a2a] rounded" />
                        )}
                        <div>
                          <p className="text-[#f0f0f0] font-medium">{set.name}</p>
                          <p className="text-xs text-[#555] font-mono">{set.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {editingId === set.id ? (
                        <input
                          value={editValues.serie ?? ''}
                          onChange={e => setEditValues(prev => ({ ...prev, serie: e.target.value }))}
                          className="w-36 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                        />
                      ) : (
                        <span className="text-[#888] text-xs">{set.serie}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {editingId === set.id ? (
                        <input
                          value={editValues.ptcgo_code ?? ''}
                          onChange={e => setEditValues(prev => ({ ...prev, ptcgo_code: e.target.value }))}
                          className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                        />
                      ) : (
                        <span className="text-[#888] text-xs">{set.ptcgo_code ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {editingId === set.id ? (
                        <input
                          value={editValues.release_date ?? ''}
                          onChange={e => setEditValues(prev => ({ ...prev, release_date: e.target.value }))}
                          placeholder="YYYY/MM/DD"
                          className="w-28 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#e3350d]"
                        />
                      ) : (
                        <span className="text-[#888] text-xs">{set.release_date ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === set.id ? (
                          <>
                            <button
                              onClick={() => handleSaveSet(set.id)}
                              disabled={saving}
                              title="Salvar"
                              className="text-[#22c55e] hover:text-white transition-colors cursor-pointer"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              title="Cancelar"
                              className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditSet(set)}
                              title="Editar"
                              className="text-[#555] hover:text-[#f0f0f0] transition-colors cursor-pointer"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteSet(set.id)}
                              title="Deletar"
                              className="text-[#555] hover:text-[#e3350d] transition-colors cursor-pointer"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  );
};

export default Admin
