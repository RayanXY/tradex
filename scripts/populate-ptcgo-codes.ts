import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const populate = async () => {
  console.log('Fetching sets from pokemontcg.io...')

  const res = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=250')
  const data = await res.json()

  let updated = 0
  let skipped = 0

  for (const s of data.data) {
    if (!s.ptcgoCode) { skipped++; continue }

    const { error } = await supabase
      .from('sets')
      .update({ ptcgo_code: s.ptcgoCode })
      .eq('id', s.id)

    if (error) {
      console.error(`Error updating ${s.id}:`, error.message)
    } else {
      updated++
    }
  }

  console.log(`Done! Updated: ${updated}, Skipped (no ptcgoCode): ${skipped}`)
}

populate()
