import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getProfileFromCache, setProfileInCache, type Profile as BaseProfile } from '../../lib/profileCache';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';

type Profile = BaseProfile & { avatar_version?: number|null; verified?: boolean|null };

export default function AuthorHeader({ userId, initial }: { userId: string; initial?: Profile | null; }) {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(initial ?? (getProfileFromCache(userId) as any) ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [finalUrl, setFinalUrl] = useState<string>('');

  useEffect(() => {
    const needs = !p || p.display_name == null || p.username == null || p.avatar_url == null;
    if (needs && userId) {
      (async () => {
        const r = await supabase.from('user_profiles').select('id, display_name, username, avatar_url, avatar_version, verified').eq('id', userId).maybeSingle();
        if (r.data) {
          const prof: Profile = { id: r.data.id, display_name: r.data.display_name, username: r.data.username, avatar_url: r.data.avatar_url, verified: (r.data as any).verified, avatar_version: (r.data as any).avatar_version };
          setProfileInCache(prof as any);
          setP(prof);
        }
      })();
    }
  }, [userId]);

  useEffect(() => {
    const raw = p?.avatar_url ?? null;
    const url = resolveAvatarPublicUrl(supabase, raw, { userId, version: p?.avatar_version ?? undefined }) ?? (p ? fallbackAvatar(p.display_name ?? p.username ?? null) : '');
    setAvatarUrl(raw || '');
    setFinalUrl(url || '');
  }, [p?.avatar_url, p?.avatar_version, userId]);

  const name = p?.display_name || 'User';
  const username = p?.username ? '@' + p.username : '@user';

  return (
    <Pressable onPress={() => router.push(`/u/${userId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {finalUrl ? (
        <ExpoImage source={{ uri: finalUrl }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }} contentFit="cover" />
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
