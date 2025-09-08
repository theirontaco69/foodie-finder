Deno.serve(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  // TODO: query Postgres FTS or trigram for name/cuisine prefix
  return new Response(JSON.stringify({ suggestions: q ? [q, q+" bar", q+" cafe"] : [] }), { headers: { "content-type": "application/json" } });
});
