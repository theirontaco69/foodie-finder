import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getProfileFromCache, setProfileInCache, type Profile } from '../../lib/profileCache';
import { resolveAvatarPublicUrl, fallbackAvatar } from "../../lib/avatar";
import { supabase } from "../../lib/supabase";


function resolveAvatar(u: string | null | undefined, userId: string): string {
  if (!u) return '';
  let s = String(u);

  // Replace placeholders anywhere (works for paths AND full URLs)
  s = s
    .replace(/%3CYOUR-USER-ID%3E/gi, userId)
    .replace(/<YOUR-USER-ID>/gi, userId)
    .replace(/YOUR-USER-ID/gi, userId)
    .replace(/<id>/gi, userId);

  // If it is a full Supabase public URL, try to rebuild with storage API
  const m = s.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (m) {
    const bucket = m[1];
    const key = m[2];
    const r = supabase.storage.from(bucket).getPublicUrl(key);
    return r?.data?.publicUrl || s;
  }

  // If it's any http(s) URL that's not a supabase public path, return directly
  if (/^https?:\/\//i.test(s)) return s;

  // Otherwise treat as "bucket/key" or bare filename
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

  useEffect(() => {
    setAvatarUrl(resolveAvatar(p?.avatar_url ?? null, userId, p?.display_name ?? null, p?.username ?? null, (p as any).avatar_version));
  }, [p?.avatar_url, userId]);

  useEffect(() => {
    let aborted = false;
    const needsFetch = !p || p.display_name == null || p.username == null || !p.avatar_url;
    if (needsFetch && userId) {
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, avatar_version')
          .eq('id', userId)
          .maybeSingle();
        if (aborted) return;
        if (data) {
          const prof: Profile = {
            id: data.id,
            display_name: data.display_name,
            username: data.username,
            avatar_url: data.avatar_url,
          };
          setProfileInCache(prof);
          setP(prof);
          setAvatarUrl(resolveAvatar(prof.avatar_url ?? null, userId, prof.display_name ?? null, prof.username ?? null, (prof as any).avatar_version));
        }
      })();
    }
    return () => { aborted = true; };
  }, [userId]);

  useEffect(() => {
    if (avatarUrl) console.log('AuthorHeader final avatar', userId, avatarUrl);
  }, [avatarUrl, userId]);

  const name = p?.display_name || 'User';
  const username = p?.username ? '@' + p.username : '@user';

  return (
    <Pressable onPress={() => router.push(`/u/${userId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {avatarUrl ? (
        <ExpoImage
          source={{ uri: avatarUrl }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }} />
      )}
      <View>
        <Text style={{ fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: '#666', fontSize: 12 }}>{username}</Text>
      </View>
    </Pressable>
  );
}
