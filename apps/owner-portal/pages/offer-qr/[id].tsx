import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';

export default function OfferQR() {
  const { query } = useRouter();
  const id = typeof query.id === 'string' ? query.id : '';
  const [qr, setQr] = useState('');
  const [msg, setMsg] = useState('Loading…');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setMsg('Signing…');
      const res = await fetch(`/api/offers/sign?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.ok) {
        setQr(data.qr);
        setMsg('');
      } else {
        setMsg(data.error || 'Error');
      }
    })();
  }, [id]);

  function downloadPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer-${id}.png`;
    a.click();
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Offer QR</h1>
        <Link href="/offers-list">Back</Link>
      </div>
      {msg && <p>{msg}</p>}
      {!msg && qr && (
        <div style={{ marginTop: 24, display: 'grid', gap: 16, justifyItems: 'center' }}>
          <QRCodeCanvas value={qr} size={256} includeMargin level="M" ref={canvasRef as any} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={downloadPNG}>Download PNG</button>
            <button onClick={() => navigator.clipboard.writeText(qr)}>Copy QR String</button>
          </div>
          <p style={{ opacity: 0.7, fontSize: 12 }}>
            QR encodes a signed value. Tampering breaks validation.
          </p>
        </div>
      )}
    </main>
  );
}
