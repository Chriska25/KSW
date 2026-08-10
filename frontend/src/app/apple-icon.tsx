import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090b',
          borderRadius: 40,
          border: '6px solid #fbbf24',
          boxShadow: '0 0 32px rgba(251, 191, 36, 0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: 92,
            height: 68,
            border: '5px solid #fbbf24',
            borderRadius: 14,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -16,
              left: 18,
              width: 28,
              height: 12,
              border: '5px solid #fbbf24',
              borderBottom: 'none',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
            }}
          />
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '5px solid #fbbf24',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
