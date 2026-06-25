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
    `${supabaseUrl}/rest/v1/cards?user_id=eq.${user.id}&active=eq.true&type=eq.${type}&select=name,image_url&limit=1`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  const cards = await cardsRes.json();
  const label = type === 'sell' ? 'Vendo' : 'Procuro';
  
  const imageUrl = cards[0]?.image_url ?? null;

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f0f0f',
          padding: '60px',
          fontFamily: 'sans-serif',
        },
        children: imageUrl
          ? {
              type: 'img',
              props: {
                src: imageUrl,
                width: 200,
                height: 280,
                style: { borderRadius: '8px' },
              },
            }
          : {
              type: 'div',
              props: {
                style: { color: '#f0f0f0', fontSize: '52px' },
                children: `${user.name} · ${label}`,
              },
            },
      },
    },
    { width: 1200, height: 630 }
  );
}
