import React, { useState } from "react";

export default function RedeemPage() {
  const [offerId, setOfferId] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult("");
    const res = await fetch("/api/offers/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offer_id: offerId }),
    });
    const data = await res.json();
    setLoading(false);
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>Redeem Offer (Dev Only)</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input placeholder="offer_id (uuid)" value={offerId} onChange={e => setOfferId(e.target.value)} />
        <button disabled={loading || !offerId} type="submit">{loading ? "Redeeming..." : "Redeem"}</button>
      </form>
      <pre style={{ background: "#f6f6f6", padding: 12, marginTop: 16, borderRadius: 8 }}>{result}</pre>
    </main>
  );
}
