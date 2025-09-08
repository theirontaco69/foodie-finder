// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // TODO: auth check via getUser
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { restaurant_id, kind } = await req.json();
  // TODO: call Mux or Cloudflare Images and return direct upload URL
  return new Response(JSON.stringify({ uploadUrl: "https://example/upload", kind, restaurant_id }), { headers: { "content-type": "application/json" } });
});
