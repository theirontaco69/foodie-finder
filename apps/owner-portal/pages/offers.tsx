import React, { useEffect, useState } from "react";

type Restaurant = { id: string; name: string };
type CreateOfferPayload = {
  restaurant_id: string;
  title: string;
  description?: string;
  kind: "percent" | "fixed" | "bogo";
  value: number | string;
  start_at: string;
  end_at: string;
  daily_limit?: number | string;
  per_user_limit?: number | string;
};

export default function OffersPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [payload, setPayload] = useState<CreateOfferPayload>({
    restaurant_id: "",
    title: "",
    description: "",
    kind: "percent",
    value: 10,
    start_at: new Date(Date.now() + 3600_000).toISOString(),
    end_at: new Date(Date.now() + 7*24*3600_000).toISOString(),
    daily_limit: 50,
    per_user_limit: 1,
  });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/my/restaurants");
      const data = await res.json();
      if (data.ok && data.restaurants?.length) {
        setRestaurants(data.restaurants);
        setPayload(p => ({ ...p, restaurant_id: data.restaurants[0].id }));
      } else {
        setRestaurants([]);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult("");
    const res = await fetch("/api/offers/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    setResult(JSON.stringify(data, null, 2));
  }

  function field<K extends keyof CreateOfferPayload>(k: K, v: any) {
    setPayload((p) => ({ ...p, [k]: v }));
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>Create Offer</h1>

      {restaurants.length === 0 ? (
        <p>No restaurants linked to your account.</p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <select value={payload.restaurant_id} onChange={e => field("restaurant_id", e.target.value)}>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input placeholder="title" value={payload.title} onChange={e => field("title", e.target.value)} />
          <textarea placeholder="description" value={payload.description} onChange={e => field("description", e.target.value)} />
          <select value={payload.kind} onChange={e => field("kind", e.target.value)}>
            <option value="percent">percent</option>
            <option value="fixed">fixed</option>
            <option value="bogo">bogo</option>
          </select>
          <input type="number" placeholder="value" value={payload.value} onChange={e => field("value", e.target.value)} />
          <input placeholder="start_at (ISO)" value={payload.start_at} onChange={e => field("start_at", e.target.value)} />
          <input placeholder="end_at (ISO)" value={payload.end_at} onChange={e => field("end_at", e.target.value)} />
          <input type="number" placeholder="daily_limit" value={payload.daily_limit} onChange={e => field("daily_limit", e.target.value)} />
          <input type="number" placeholder="per_user_limit" value={payload.per_user_limit} onChange={e => field("per_user_limit", e.target.value)} />
          <button disabled={loading || !payload.restaurant_id} type="submit">{loading ? "Creating..." : "Create Offer"}</button>
        </form>
      )}

      <pre style={{ background: "#f6f6f6", padding: 12, marginTop: 16, borderRadius: 8 }}>{result}</pre>
    </main>
  );
}
