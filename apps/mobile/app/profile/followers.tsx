
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, FlatList } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';
import VerifiedBadge from '../components/VerifiedBadge';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl } from '../../lib/avatar';

type Profile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; avatar_version?: number | null; verified?: boolean | null };

export default function Followers() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<Profile[] | null>(null);

  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setMeId(data?.user?.id ?? null); })(); }, []);
  useEffect(() => {
    if (!meId) return;
    (async () => {
      const f = await supabase.from('follows').select('follower_id').eq('followee_id', meId).limit(1000);
      const ids = (f.data ?? []).map(x => x.follower_id);
      if (ids.length === 0) { setItems([]); return; }
      const { data } = await supabase.from('profiles').select('id, display_name, username, avatar_url, avatar_version, verified:is_verified').in('id', ids);
      setItems((data ?? []) as Profile[]);
    })();
  }, [meId]);

  return (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      <TopBar />
      {!items ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item: p }) => {
            const url = resolveAvatarPublicUrl(supabase, p.avatar_url, { userId: p.id, version: p.avatar_version ?? undefined });
            return (
              <Pressable onPress={() => router.push(`/u/${p.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                <ExpoImage source={url ? { uri: url } : undefined} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee' }} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>{p.display_name || 'User'}</Text>
                    {p.verified ? <VerifiedBadge size={14} /> : null}
                  </View>
                  <Text style={{ color: '#666' }}>{p.username ? '@' + p.username : '@user'}</Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<View style={{ padding: 16 }}><Text>No followers yet</Text></View>}
        />
      )}
      <NavBar />
    </View>
  );
}
