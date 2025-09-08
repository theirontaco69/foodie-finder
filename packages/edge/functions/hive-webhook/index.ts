Deno.serve(async (req) => {
  // TODO: verify Hive signature, set moderation_status approved/rejected
  console.log("hive webhook", await req.text());
  return new Response("ok");
});
