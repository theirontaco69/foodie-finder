import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function ScanPage() {
  const [msg, setMsg] = useState("Point the camera at the QR");
  const [redeemJson, setRedeemJson] = useState("");
  const [devices, setDevices] = useState<Array<{id: string; label: string}>>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const scannerRef = useRef<any>(null);
  const runningRef = useRef(false);
  const lockedRef = useRef(false);

  async function start() {
    setRedeemJson("");
    setMsg("Starting camera…");
    lockedRef.current = false;
    try {
      const mod = await import("html5-qrcode");
      const { Html5Qrcode } = mod as any;
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode("qr-reader");
      runningRef.current = true;
      await scannerRef.current.start(
        { deviceId: { exact: cameraId } },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onScan
      );
      setMsg("Scanning…");
    } catch (e: any) {
      setMsg(e?.message || "Camera error");
    }
  }

  async function stop() {
    try {
      if (scannerRef.current && runningRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {}
    runningRef.current = false;
  }

  async function onScan(text: string) {
    if (lockedRef.current) return;
    const s = text.trim();
    const signed = /^offer:([0-9a-fA-F-]{36}):([a-f0-9]{64})$/.test(s);
    const plain = /^[0-9a-fA-F-]{36}$/.test(s);
    if (!signed && !plain) return;

    lockedRef.current = true;
    setMsg("Redeeming…");
    await stop();
    try {
      const body = signed ? { qr: s } : { offer_id: s };
      const res = await fetch("/api/offers/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setRedeemJson(JSON.stringify(data, null, 2));
      setMsg(data.ok ? "Redeemed" : "Error");
    } catch {
      setMsg("Network error");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        const { Html5Qrcode } = mod as any;
        const cams = await Html5Qrcode.getCameras();
        const list = cams.map((c: any) => ({ id: c.id, label: c.label || "Camera" }));
        setDevices(list);
        const back = list.find(d => /back|rear|environment/i.test(d.label)) || list[0];
        if (back) setCameraId(back.id);
      } catch (e: any) {
        setMsg(e?.message || "No camera");
      }
    })();
    return () => { stop(); };
  }, []);

  useEffect(() => {
    if (cameraId) start();
    return () => { stop(); };
  }, [cameraId]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Scan & Redeem</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/offers-list" style={{ textDecoration: "none" }}>Back</Link>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <span>Camera:</span>
        <select value={cameraId} onChange={e => setCameraId(e.target.value)} style={{ minWidth: 240 }}>
          {devices.map(d => (<option key={d.id} value={d.id}>{d.label}</option>))}
        </select>
        <button onClick={() => { stop(); start(); }}>Restart</button>
      </div>

      <div style={{ marginTop: 12 }}>{msg}</div>

      <div id="qr-reader" style={{
        width: 320, height: 320, marginTop: 16, border: "1px solid #ddd",
        borderRadius: 12, overflow: "hidden", display: "grid", placeItems: "center"
      }} />

      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        <details>
          <summary>Manual entry</summary>
          <ManualRedeem onDone={(j) => setRedeemJson(j)} onStatus={(s) => setMsg(s)} />
        </details>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8, minHeight: 80 }}>{redeemJson}</pre>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { lockedRef.current = false; setRedeemJson(""); start(); }}>Scan Again</button>
          <button onClick={() => { stop(); setMsg("Stopped"); }}>Stop</button>
        </div>
      </div>
    </main>
  );
}

function ManualRedeem(props: { onDone: (json: string) => void; onStatus: (s: string) => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function redeem() {
    const s = input.trim();
    const isSigned = /^offer:([0-9a-fA-F-]{36}):([a-f0-9]{64})$/.test(s);
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(s);
    if (!isSigned && !isUuid) {
      props.onDone(JSON.stringify({ error: "Enter a UUID or a signed QR string" }, null, 2));
      props.onStatus("Error");
      return;
    }
    props.onStatus("Redeeming…");
    setLoading(true);
    const body = isSigned ? { qr: s } : { offer_id: s };
    const res = await fetch("/api/offers/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setLoading(false);
    props.onDone(JSON.stringify(data, null, 2));
    props.onStatus(data.ok ? "Redeemed" : "Error");
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input placeholder="offer UUID or signed QR string" value={input} onChange={e => setInput(e.target.value)} style={{ flex: 1 }} />
      <button onClick={redeem} disabled={!input || loading}>{loading ? "…" : "Redeem"}</button>
    </div>
  );
}
