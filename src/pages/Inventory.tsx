import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { SubmitEvent } from 'react'
import usePokemonSearch, { type PokemonCard } from '../hooks/usePokemonSearch'

interface InventoryCard {
  id: string
  tcg_card_id: string
  name: string
  set_name: string
  image_url: string
  price: number
  quantity: number
  active: boolean
}

const Pokeball = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="#e3350d" strokeWidth="2.5"/>
    <path d="M2 24h44" stroke="#e3350d" strokeWidth="2.5"/>
    <circle cx="24" cy="24" r="6" fill="#0f0f0f" stroke="#e3350d" strokeWidth="2.5"/>
    <circle cx="24" cy="24" r="3" fill="#e3350d"/>
    <path d="M2 24C2 12 12 2 24 2C36 2 46 12 46 24" fill="#e3350d" fillOpacity="0.15"/>
  </svg>
)

const Inventory = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { results, loading: searching, error, search, clear } = usePokemonSearch()

  const [query, setQuery] = useState('')
  const [inventory, setInventory] = useState<InventoryCard[]>([])
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)

  useState(() => {
    if (!user) return
    supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .then(({ data }) => {
        setInventory(data ?? [])
        setLoadingInventory(false)
      })
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearch = (e: SubmitEvent) => {
    e.preventDefault()
    search(query)
  }

  const handleSelectCard = (card: PokemonCard) => {
    setSelectedCard(card)
    setPrice('')
    setQuantity('1')
    clear()
    setQuery('')
  }

  const handleAddCard = async () => {
    if (!selectedCard || !user || !price) return
    setSaving(true)

    const { data, error: supabaseError } = await supabase.from('cards').insert({
      user_id: user.id,
      tcg_card_id: selectedCard.id,
      name: selectedCard.name,
      set_name: selectedCard.set.name,
      image_url: selectedCard.images.small,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      active: true,
    }).select().single()

    if (!supabaseError && data) {
      setInventory(prev => [data, ...prev])
      setSelectedCard(null)
    }
    setSaving(false)
  }

  const handleRemove = async (id: string) => {
    await supabase.from('cards').update({ active: false }).eq('id', id)
    setInventory(prev => prev.filter(c => c.id !== id))
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">

      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pokeball />
          <span className="text-lg font-bold tracking-widest uppercase">Tradex</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to={`/u/${user.phone}`}
            className="text-sm text-[#f4d03f] hover:underline"
          >
            Ver mostruário
          </Link>
          <span className="text-sm text-[#888]">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-[#888] hover:text-[#e3350d] transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Search */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Adicionar carta</h2>
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
              className="bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-3 text-sm transition-colors"
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
          {error && (
            <p className="text-sm text-[#e3350d] mt-2">{error}</p>
          )}
        </section>

        {/* Search results */}
        {results.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Resultados</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {results.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className="group flex flex-col items-center gap-1 p-2 rounded-lg border border-[#2a2a2a] hover:border-[#e3350d] bg-[#1a1a1a] transition-colors"
                >
                  <img src={card.images.small} alt={card.name} className="w-full rounded" />
                  <span className="text-xs text-[#888] text-center group-hover:text-[#f0f0f0] transition-colors leading-tight">
                    {card.set.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Add card form */}
        {selectedCard && (
          <section className="mb-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Confirmar adição</h2>
            <div className="flex gap-6 items-start">
              <img src={selectedCard.images.small} alt={selectedCard.name} className="w-24 rounded-lg" />
              <div className="flex-1">
                <p className="font-semibold text-[#f0f0f0]">{selectedCard.name}</p>
                <p className="text-sm text-[#888] mb-4">{selectedCard.set.name} · #{selectedCard.number}</p>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Preço (R$)"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-36 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
                  />
                  <input
                    type="number"
                    placeholder="Qtd"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    min="1"
                    className="w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleAddCard}
                    disabled={saving || !price}
                    className="bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-2 text-sm transition-colors"
                  >
                    {saving ? 'Salvando...' : 'Adicionar'}
                  </button>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Inventory list */}
        <section>
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Meu inventário</h2>
          {loadingInventory ? (
            <p className="text-sm text-[#555]">Carregando...</p>
          ) : inventory.length === 0 ? (
            <p className="text-sm text-[#555]">Nenhuma carta adicionada ainda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {inventory.map(card => (
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
                      <p className="text-sm font-bold text-[#f4d03f]">R$ {card.price.toFixed(2)}</p>
                      <p className="text-xs text-[#888]">Qtd: {card.quantity}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(card.id)}
                      className="text-xs text-[#555] hover:text-[#e3350d] transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Inventory
