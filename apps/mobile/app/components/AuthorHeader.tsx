import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import VerifiedBadge from "./VerifiedBadge";
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getProfileFromCache, setProfileInCache, type Profile } from '../../lib/profileCache';
import { resolveAvatarPublicUrl, fallbackAvatar } from "../../lib/avatar";


function resolveAvatar(u: string | null | undefined, userId: string): string {
  if (!u) return '';
  let s = String(u);

  s = s
    .replace(/%3CYOUR-USER-ID%3E/gi, userId)
    .replace(/<YOUR-USER-ID>/gi, userId)
    .replace(/YOUR-USER-ID/gi, userId)
    .replace(/<id>/gi, userId);

  const m = s.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (m) {
    const bucket = m[1];
    const key = m[2];
    const r = supabase.storage.from(bucket).getPublicUrl(key);
    return r?.data?.publicUrl || s;
  }

  if (/^https?:\/\//i.test(s)) return s;

  const clean = s.replace(/^\/+/, '');
  const slash = clean.indexOf('/');
  if (slash === -1) {
    const r = supabase.storage.from('avatars').getPublicUrl(clean);
    return r?.data?.publicUrl || '';
  }
  const bucket = clean.slice(0, slash);
  const key = clean.slice(slash + 1);
  const r = supabase.storage.from(bucket).getPublicUrl(key);
  return r?.data?.publicUrl || '';
}

export default function AuthorHeader({ userId, initial }: { userId: string; initial?: Profile | null; }) {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(initial ?? getProfileFromCache(userId) ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const displayLabel = p?.display_name ?? p?.username ?? null;
  const finalAvatarUrl = resolveAvatarPublicUrl(supabase, avatarUrl ?? null, { userId }) ?? (displayLabel ? fallbackAvatar(displayLabel) : avatarUrl);

  useEffect(() => {
    setAvatarUrl(resolveAvatar(p?.avatar_url ?? null, userId, p?.display_name ?? null, p?.username ?? null, (p?.avatar_version as any)));
  }, [p?.avatar_url, userId]);

  useEffect(() => {
    let aborted = false;
    const needsFetch = !p || p.display_name == null || p.username == null || !p.avatar_url || p.verified == null;
    if (needsFetch && userId) {
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, avatar_version, verified:is_verified')
          .eq('id', userId)
          .maybeSingle();
        if (aborted) return;
        if (data) {
          const prof: Profile = {
            id: data.id,
            display_name: data.display_name,
            username: data.username,
            avatar_url: data.avatar_url,
            verified: (data as any).verified,
            verified: (data as any).verified,
          };
          setProfileInCache(prof);
          setP(prof);
          setAvatarUrl(resolveAvatar(prof.avatar_url ?? null, userId, prof.display_name ?? null, prof.username ?? null, (data as any).avatar_version));
        }
      })();
    }
    return () => { aborted = true; };
  }, [userId]);

  useEffect(() => {
    if (avatarUrl) console.log('AuthorHeader final avatar', userId, finalAvatarUrl);
  }, [avatarUrl, userId]);

  const name = p?.display_name || 'User';
  const username = p?.username ? '@' + p.username : '@user';

  return (
    <Pressable onPress={() => router.push(`/u/${userId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {avatarUrl ? (
        <ExpoImage
          source={finalAvatarUrl ? { uri: finalAvatarUrl } : undefined}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }} />
      )}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontWeight: '600' }}>{name}</Text>
          {p?.verified ? <VerifiedBadge size={14} /> : null}
        </View>
        <Text style={{ color: '#666', fontSize: 12 }}>{username}</Text>
      </View>
    </Pressable>
  );
}
