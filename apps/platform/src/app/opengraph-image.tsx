import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'XRNotify - Real-time XRPL Webhook Notifications';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            XR
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '-1px',
            }}
          >
            XRNotify
          </span>
        </div>
        <p
          style={{
            fontSize: '28px',
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.4,
          }}
        >
          Real-time webhook notifications for the XRP Ledger
        </p>
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '40px',
          }}
        >
          {['Payments', 'NFTs', 'DEX', 'Trustlines', 'Escrows'].map((label) => (
            <div
              key={label}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#34d399',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
