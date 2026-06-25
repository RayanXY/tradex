return new ImageResponse(
  {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#0f0f0f',
        padding: '40px',
      },
      children: {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', gap: '24px' },
          children: [
            imgSrc
              ? { type: 'img', props: { src: imgSrc, width: 140, height: 196, style: { borderRadius: '8px' } } }
              : { type: 'div', props: { style: { width: '140px', height: '196px', backgroundColor: '#1a1a1a', borderRadius: '8px' }, children: '' } },
            {
              type: 'div',
              props: {
                style: { color: '#f0f0f0', fontSize: '48px' },
                children: `${user.name} — ${label}`,
              },
            },
          ],
        },
      },
    },
  },
  { width: 1200, height: 630 }
);
