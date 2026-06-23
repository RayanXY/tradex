import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const inferSerie = (id: string): string => {
  if (id.startsWith('sv')) return 'Scarlet & Violet'
  if (id.startsWith('swsh')) return 'Sword & Shield'
  if (id.startsWith('me')) return 'Mega Evolution'
  if (id.startsWith('sm')) return 'Sun & Moon'
  if (id.startsWith('xy')) return 'XY'
  if (id.startsWith('bw')) return 'Black & White'
  if (id.startsWith('hgss') || id.startsWith('col')) return 'HeartGold & SoulSilver'
  if (id.startsWith('pl')) return 'Platinum'
  if (id.startsWith('dp')) return 'Diamond & Pearl'
  if (id.startsWith('ex')) return 'EX'
  if (id.startsWith('neo')) return 'Neo'
  if (id.startsWith('gym')) return 'Gym'
  if (id.startsWith('base')) return 'Base'
  if (id.startsWith('tcgp') || id.match(/^[AB]\d/)) return 'TCG Pocket'
  return 'Other'
}

const populate = async () => {
  console.log('Fetching sets from TCGdex...')

  const res = await fetch('https://api.tcgdex.net/v2/en/sets?pagination:itemsPerPage=500')
  const data = await res.json()

  const sets = data.map((s: any) => ({
    id: s.id,
    name: s.name,
    serie: inferSerie(s.id),
    total: s.cardCount?.official ?? s.cardCount?.total ?? 0,
    release_date: null,
  }))

  console.log(`Inserting ${sets.length} sets...`)

  const { error } = await supabase
    .from('sets')
    .upsert(sets, { onConflict: 'id' })

  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('Done!')
  }
}

populate()
