import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '../../lib/supabase';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';
import VerifiedBadge from '../components/VerifiedBadge';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  verified: boolean | null;
  created_at: string | null;
};

export default function PublicProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [iFollow, setIFollow] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const isMe = meId && id && meId === id;

  useEffect(() => {
    (async () => {
      const a = await supabase.auth.getUser();

useEffect(() => {
  if (!id) return;
  (async () => {
    const { data } = await supabase
      .from('posts')
      .select('id,author_id,is_video,media_urls,caption,created_at')
      .eq('author_id', String(id))
      .order('created_at', { ascending: false })
      .limit(100);
    setPosts((data as any) || []);
  })();
}, [id]);
      setMeId(a?.data?.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    let stop=false;
    (async () => {
      setLoading(true);
      const r = await supabase
        .from('user_profiles')
        .select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at')
        .eq('id', String(id))
        .maybeSingle();
      if (!stop) setProfile((r.data as any) || null);
      if (!stop) setLoading(false);
    })();
    return () => { stop=true };
  }, [id]);

  async function refreshFollowState(viewId: string, myId: string) {
    const a = await supabase.from('follows').select('id', { head: true, count: 'exact' }).eq('follower_id', myId).eq('followee_id', viewId);
    const b = await supabase.from('follows').select('id', { head: true, count: 'exact' }).eq('follower_id', viewId).eq('followee_id', myId);
    setIFollow((a.count || 0) > 0);
    setFollowsMe((b.count || 0) > 0);
  }

  useEffect(() => {
    if (!id || !meId) return;
    refreshFollowState(String(id), meId);
  }, [id, meId]);

  async function onPressFollow() {
    if (!id || !meId) return;
    const r = await supabase.from('follows').insert({ follower_id: meId, followee_id: String(id) });
    if (r.error && !String(r.error.message || '').toLowerCase().includes('duplicate')) {
      Alert.alert('Follow failed', r.error.message);
      return;
    }
    setIFollow(true);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, paddingBottom: 96 }}>
        <TopBar />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
        <NavBar />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, paddingBottom: 96 }}>
        <TopBar />
        <View style={{ padding: 16 }}>
          <Text>User not found.</Text>
        </View>
        <NavBar />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ width: '100%', aspectRatio: 3, backgroundColor: '#e9ecef' }}>
          <ExpoImage source={profile.banner_url ? { uri: profile.banner_url } : undefined} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ borderRadius: 40, overflow: 'hidden', width: 80, height: 80, borderWidth: 3, borderColor: '#fff', backgroundColor: '#eee' }}>
            <ExpoImage source={profile.avatar_url ? { uri: profile.avatar_url } : undefined} contentFit="cover" style={{ width: '100%', height: '100%' }} />
          </View>

          {!isMe && !iFollow ? (
            <Pressable onPress={onPressFollow} style={{ paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#fff' }}>
              <Text style={{ fontWeight: '600' }}>Follow</Text>
            </Pressable>
          ) : <View style={{ width: 0, height: 0 }} />}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{profile.display_name || 'User'}</Text>
            {profile.verified ? <VerifiedBadge size={16} /> : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text style={{ color: '#666' }}>{profile.username ? '@' + profile.username : '@user'}</Text>
            {followsMe ? <Text style={{ color: '#06f', fontSize: 12 }}>Follows you</Text> : null}
          </View>

          {profile.bio ? <Text style={{ marginTop: 8 }}>{profile.bio}</Text> : null}
        </View>
      </ScrollView>
      <NavBar />
    </View>
  );
}


<View style={{ padding: 16 }}>
  <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Posts</Text>
  {posts.length === 0 ? (
    <Text style={{ color: '#666' }}>No posts yet.</Text>
  ) : (
    <View style={{ gap: 12 }}>
      {posts.map((p:any) => (
        <View key={p.id} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12 }}>
          {(p.media_urls||[]).map((u:string,i:number)=>(
            <Image key={i} source={{ uri: u }} style={{ width: '100%', height: 320, borderRadius: 8 }} />
          ))}
          {p.caption ? <Text style={{ marginTop: 8 }}>{p.caption}</Text> : null}
        </View>
      ))}
    </View>
  )}
</View>
