import { SignJWT } from "npm:jose@5";

Deno.serve(async (req) => {
  const { offer_id, user_id, secret } = await req.json();
  const jwt = await new SignJWT({ offer_id, sub: user_id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
  return new Response(JSON.stringify({ token: jwt }), { headers: { "content-type": "application/json" } });
});
