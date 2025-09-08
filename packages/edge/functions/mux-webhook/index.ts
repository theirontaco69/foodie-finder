Deno.serve(async (req) => {
  // TODO: verify Mux signature, update media row with playback_id
  console.log("mux webhook", await req.text());
  return new Response("ok");
});
