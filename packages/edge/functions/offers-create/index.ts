import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json();
  // TODO: auth owner, insert into public.offers
  return new Response(JSON.stringify({ status: "created", body }), { headers: { "content-type": "application/json" } });
});
