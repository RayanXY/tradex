import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const type = searchParams.get('type') ?? 'sell';

  if (!slug) return new Response('Missing slug', { status: 400 });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  const userRes = await fetch(
    `${supabaseUrl}/rest/v1/users?slug=eq.${slug}&select=id,name,slug&limit=1`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  const users = await userRes.json();
  if (!users?.length) return new Response('Not found', { status: 404 });

  const user = users[0];

  const cardsRes = await fetch(
    `${supabaseUrl}/rest/v1/cards?user_id=eq.${user.id}&active=eq.true&type=eq.${type}&select=name,image_url&limit=6`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  const cards = await cardsRes.json();

  const cardImages = await Promise.all(
    cards.slice(0, 6).map(async (card) => {
      try {
        const res = await fetch(card.image_url);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return { ...card, src: `data:image/webp;base64,${base64}` };
      } catch {
        return { ...card, src: null };
      }
    })
  );

  const label = type === 'sell' ? 'Vendo' : 'Procuro';

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f0f0f',
          padding: '40px',
          fontFamily: 'sans-serif',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '12px' },
              children: [
                { type: 'div', props: { style: { color: '#e3350d', fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px' }, children: 'TRADEX' } },
                { type: 'div', props: { style: { color: '#f0f0f0', fontSize: '20px', marginLeft: '12px' }, children: user.name } },
                { type: 'div', props: { style: { color: '#888', fontSize: '16px', marginLeft: '8px' }, children: label } },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
              children: cardImages
                .filter(card => card.src)
                .map((card, i) => ({
                  type: 'img',
                  key: String(i),
                  props: {
                    src: card.src,
                    width: 140,
                    height: 196,
                    style: {
                      borderRadius: '8px',
                      border: '1px solid #2a2a2a',
                      objectFit: 'cover',
                    },
                  },
                })),
            },
          },
          {
            type: 'div',
            props: {
              style: { marginTop: 'auto', color: '#555', fontSize: '14px' },
              children: `tradex.vercel.app/u/${slug}`,
            },
          },
        ],
      },
    },
    { width: 1200, height: 630 }
  );
}
