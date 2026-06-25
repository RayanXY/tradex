import { ImageResponse } from 'https://esm.sh/@vercel/og@0.6.3'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const type = searchParams.get('type') ?? 'sell';

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL!
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

  const userRes = await fetch(
    `${supabaseUrl}/rest/v1/users?slug=eq.${slug}&select=id,name&limit=1`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  const users = await userRes.json();
  if (!users?.length) return new Response('Not found', { status: 404 })

  const user = users[0];

  const cardsRes = await fetch(
    `${supabaseUrl}/rest/v1/cards?user_id=eq.${user.id}&active=eq.true&type=eq.${type}&select=name,image_url&limit=6`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  const cards = await cardsRes.json();

  const label = type === 'sell' ? 'Vendo' : 'Procuro';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f0f0f',
          padding: '40px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <div style={{ color: '#e3350d', fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px' }}>
            TRADEX
          </div>
          <div style={{ color: '#555', fontSize: '16px', marginLeft: '8px' }}>·</div>
          <div style={{ color: '#f0f0f0', fontSize: '20px' }}>{user.name}</div>
          <div style={{ color: '#888', fontSize: '16px', marginLeft: '8px' }}>{label}</div>
        </div>

        {/* Cards grid */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {cards.slice(0, 6).map((card: { name: string, image_url: string }, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '140px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #2a2a2a',
                backgroundColor: '#1a1a1a',
              }}
            >
              <img
                src={card.image_url}
                width={140}
                height={196}
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', color: '#555', fontSize: '14px' }}>
          tradex.vercel.app/u/{slug}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
