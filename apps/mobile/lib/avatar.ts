import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeAvatarPath(raw: string | null | undefined, userId?: string) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//i, "");
  s = s.replace(/^public\//i, "");
  s = s.replace(/^media\/avatars\//i, "avatars/");
  if (userId) s = s.replace(/<YOUR-USER-ID>/g, userId);
  if (!s || !/^\w+\/.+/.test(s)) return null;
  return s;
}

export function resolveAvatarPublicUrl(
  supabase: SupabaseClient,
  raw: string | null | undefined,
  opts?: { userId?: string; version?: number | string }
) {
  const path = normalizeAvatarPath(raw, opts?.userId);
  if (!path) return null;
  const slash = path.indexOf("/");
  const bucket = path.slice(0, slash);
  const key = path.slice(slash + 1);
  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  const v = opts?.version != null ? String(opts.version) : "";
  return v ? `${data.publicUrl}?v=${encodeURIComponent(v)}` : data.publicUrl;
}

export function fallbackAvatar(name: string | null | undefined) {
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(letter)}&background=fff&color=111&size=256&bold=true`;
}
