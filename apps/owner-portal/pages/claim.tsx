import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Row = { id: string; name: string; owned?: boolean };

export default function ClaimPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function search() {
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/restaurants/search?q=' + encodeURIComponent(q));
    const data = await res.json();
    setLoading(false);
    if (data.ok) setRows(data.results || []);
    else setMsg(data.error || 'Search error');
  }

  async function claim(id: string) {
    setMsg('');
    const res = await fetch('/api/restaurants/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ restaurant_id: id })
    });
    const data = await res.json();
    if (data.ok) {
      setMsg(data.alreadyOwned ? 'Already owned.' : 'Claimed!');
      setRows(r => r.map(x => x.id === id ? { ...x, owned: true } : x));
    } else {
      setMsg(data.error || 'Claim error');
    }
  }

  useEffect(() => { setRows([]); setMsg(''); }, [q]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Claim Restaurant</h1>
        <Link href="/offers-list" style={{ textDecoration: 'none' }}>Back to Offers</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          placeholder="Search by name (e.g., Demo Diner)"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={search} disabled={!q || loading}>{loading ? 'Searching…' : 'Search'}</button>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12, marginTop: 16 }}>
        {rows.map(r => (
          <li key={r.id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>id: {r.id}</div>
            </div>
            {r.owned ? (
              <span style={{ fontSize: 12, opacity: 0.8 }}>Owned</span>
            ) : (
              <button onClick={() => claim(r.id)}>Claim</button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
