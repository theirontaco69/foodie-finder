import { jwtVerify } from "npm:jose@5";

Deno.serve(async (req) => {
  const { token, secret } = await req.json();
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  // TODO: enforce per-user limit and insert redemption row
  return new Response(JSON.stringify({ ok: true, payload }), { headers: { "content-type": "application/json" } });
});
