import { ImageResponse } from 'next/og'

export const alt = 'Cyber Guardian Society — Security is stronger when knowledge moves'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#0C090A',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, color: '#ffffff' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#3B82F6',
              color: '#0C090A',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            CGS
          </div>
          <span>Cyber Guardian Society</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <span
            style={{
              fontSize: 72,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
              fontWeight: 600,
            }}
          >
            Security is stronger when knowledge moves.
          </span>
          <span style={{ fontSize: 28, color: 'rgba(255,255,255,.68)' }}>
            Collective defense for the people securing digital systems.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 160, height: 6, borderRadius: 999, background: '#3B82F6' }} />
          <div style={{ width: 480, height: 6, borderRadius: 999, background: '#0C090A' }} />
        </div>
      </div>
    ),
    { ...size },
  )
}
