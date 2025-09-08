import React, { useEffect, useState } from "react";
import Link from "next/link";

type Offer = {
  id: string;
  title: string;
  restaurant_id: string;
  kind: "percent" | "fixed" | "bogo";
  value: number;
  start_at: string | null;
  end_at: string | null;
  status: string;
};

export default function OffersListPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/offers/list");
    const data = await res.json();
    setLoading(false);
    if (data.ok) setOffers(data.offers || []);
    else setMsg(data.error || "Error loading offers");
  }

  useEffect(() => { load(); }, []);

  async function redeem(offer_id: string) {
    setMsg("");
    const res = await fetch("/api/offers/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offer_id }),
    });
    const data = await res.json();
    if (data.ok) setMsg("Redeemed: " + offer_id);
    else setMsg("Error: " + (data.error || "Unknown"));
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Recent Offers</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/scan" style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, textDecoration: "none" }}>
            Scan & Redeem
          </Link>
          <Link href="/claim" style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, textDecoration: "none" }}>
            Claim Restaurant
          </Link>
          <Link href="/offers" style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, textDecoration: "none" }}>
            Create Offer
          </Link>
          <button onClick={load}>Refresh</button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {msg && <p>{msg}</p>}
      {!loading && offers.length === 0 && <p>No offers found.</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {offers.map(o => (
          <li key={o.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{o.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  id: {o.id} • restaurant: {o.restaurant_id} • {o.kind} {o.value}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  status: {o.status}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/offer-qr/${o.id}`} style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, textDecoration: "none" }}>
                  QR
                </Link>
                <button onClick={() => redeem(o.id)}>Redeem</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
