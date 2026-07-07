import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Allô Eau — Plateforme officielle du dispositif d’urgence hydrique du Grand Libreville';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1F3480',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          padding: 72,
          justifyContent: 'space-between',
        }}
      >
        {/* Header : République Gabonaise + drapeau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: 60, width: 12 }}>
            <div style={{ flex: 1, background: '#009E60' }} />
            <div style={{ flex: 1, background: '#FCD116' }} />
            <div style={{ flex: 1, background: '#3A75C4' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, letterSpacing: 4, opacity: 0.8, textTransform: 'uppercase' }}>
              République Gabonaise
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
              Allô Eau
            </span>
          </div>
        </div>

        {/* Titre principal */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: '#009E60',
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              padding: '10px 18px',
              borderRadius: 6,
              textTransform: 'uppercase',
              marginBottom: 32,
            }}
          >
            État d’urgence hydrique
          </div>
          <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
            De l’eau potable, livrée à votre porte.
          </div>
          <div style={{ fontSize: 28, opacity: 0.85, marginTop: 24, maxWidth: 900 }}>
            Tarif réglementé de 4 000 FCFA le m³ · Livraison incluse · 21 quartiers desservis
          </div>
        </div>

        {/* Footer : numéros verts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 22, opacity: 0.9 }}>
          <span style={{ fontWeight: 700 }}>Numéros verts :</span>
          <span style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700 }}>18</span>
          <span style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700 }}>· 181</span>
          <span style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700 }}>· 182</span>
          <span style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700 }}>· 183</span>
          <span style={{ marginLeft: 'auto', fontSize: 22, opacity: 0.8 }}>allo-eau.ga</span>
        </div>
      </div>
    ),
    size,
  );
}
