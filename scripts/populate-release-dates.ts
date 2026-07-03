import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const populate = async () => {
  console.log('Fetching sets from pokemontcg.io...')

  const res = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=250');
  const data = await res.json();

  let updated = 0;

  for (const s of data.data) {
    if (!s.releaseDate) continue

    const { error } = await supabase
      .from('sets')
      .update({ release_date: s.releaseDate })
      .eq('id', s.id);

    if (!error) updated++
  }

  console.log(`Done! Updated: ${updated}`);
}

populate();
