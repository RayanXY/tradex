import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Seller {
  id: string
  name: string
  phone: string
  card_count: number
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

const Home = () => {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('cards')
        .select('user_id, users(id, name, phone)')
        .eq('active', true)

      if (!data) {
        setLoading(false)
        return
      }

      // Agrupa por vendedor e conta cartas
      const map = new Map<string, Seller>()
      for (const row of data) {
        const user = row.users as unknown as { id: string; name: string; phone: string }
        if (!user) continue
        if (map.has(user.id)) {
          map.get(user.id)!.card_count++
        } else {
          map.set(user.id, { ...user, card_count: 1 })
        }
      }

      setSellers(Array.from(map.values()))
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">

      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pokeball />
          <span className="text-lg font-bold tracking-widest uppercase">Tradex</span>
        </div>
        <Link to="/login" className="text-sm text-[#f4d03f] hover:underline">
          Entrar
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Vendedores</h1>
          <p className="text-sm text-[#888] mt-1">Encontre cartas disponíveis para compra ou troca.</p>
        </div>

        {loading ? (
          <p className="text-sm text-[#555]">Carregando...</p>
        ) : sellers.length === 0 ? (
          <p className="text-sm text-[#555]">Nenhum vendedor ativo no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sellers.map(seller => (
              <Link
                key={seller.id}
                to={`/u/${seller.phone}`}
                className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e3350d] rounded-xl p-5 transition-colors"
              >
                <p className="font-semibold text-[#f0f0f0]">{seller.name}</p>
                <p className="text-sm text-[#888] mt-1">
                  {seller.card_count} {seller.card_count === 1 ? 'carta disponível' : 'cartas disponíveis'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home
