
import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';
import { follow, isFollowing, formatCount } from '../../lib/social';
import NavBar from '../components/NavBar';

type Profile = {
  id: string; username: string|null; display_name: string|null; avatar_url: string|null; banner_url: string|null;
  bio: string|null; location: string|null; website: string|null; birthdate: string|null; verified: boolean|null;
};
type Post = { id: string; author_id: string; is_video: boolean; media_urls: string[]; caption: string|null; created_at: string };

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<'posts'|'videos'|'reposts'|'reviews'|'tags'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0, totalLikes: 0 });
  const [showFollow, setShowFollow] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id ?? null;
      setMe(uid);
      if (!id) return;
      await loadProfile(id);
      await loadCounts(id);
      await loadPosts(id);
      await loadReposts(id);
      if (uid && uid !== id) {
        setShowFollow(!(await isFollowing(uid, id)));
        const fy = await supabase.from('follows').select('follower_id').eq('follower_id', id).eq('followee_id', uid).maybeSingle();
        setFollowsYou(!!fy.data);
      }
    })();
  }, [id]);

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id,username,display_name,avatar_url,banner_url,bio,location,website,birthdate,verified:is_verified')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data as any);
  }
  async function loadCounts(uid: string) {
    const followersQ = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', uid);
    const followingQ = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid);
    const myPosts = await supabase.from('posts').select('id').eq('author_id', uid).limit(1000);
    const ids = (myPosts.data || []).map(p => p.id);
    let totalLikes = 0;
    if (ids.length) {
      const { data } = await supabase.from('post_likes').select('post_id').in('post_id', ids);
      totalLikes = (data || []).length;
    }
    setCounts({ followers: followersQ.count ?? 0, following: followingQ.count ?? 0, totalLikes });
  }
  async function loadPosts(uid: string) {
    const { data } = await supabase
      .from('posts')
      .select('id,author_id,is_video,media_urls,caption,created_at')
      .eq('author_id', uid)
      .order('created_at', { ascending: false })
      .limit(100);
    setPosts(data || []);
  }
  async function loadReposts(uid: string) {
    const r = await supabase.from('reposts').select('post_id').eq('user_id', uid).order('created_at', { ascending: false }).limit(100);
    const ids = (r.data || []).map(x => x.post_id);
    if (!ids.length) { setReposts([]); return; }
    const p = await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').in('id', ids);
    setReposts((p.data || []).sort((a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())));
  }
  function openWebsite(url?: string | null) {
    if (!url) return;
    const has = /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
    WebBrowser.openBrowserAsync(has);
  }
  function TabLink({ t, label }: { t: typeof tab; label: string }) {
    const active = tab === t;
    return (
      <Pressable onPress={() => setTab(t)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: active ? '#000' : 'transparent' }}>
        <Text style={{ fontWeight: active ? '700' : '500' }}>{label}</Text>
      </Pressable>
    );
  }

  const header = (
    <View>
      {profile?.banner_url
        ? <Image source={{ uri: profile.banner_url }} style={{ width: '100%', height: 140 }} />
        : <View style={{ width: '100%', height: 140, backgroundColor: '#ddd' }} />
      }
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ marginTop: -40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Image source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined}
            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee', borderWidth: 3, borderColor: '#fff' }} />
          {me && me === id ? (
            <Pressable onPress={() => router.push('/profile?edit=1')}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' }}>
              <Text>Edit profile</Text>
            </Pressable>
          ) : me && me !== id && showFollow ? (
            <Pressable onPress={async () => { if (!me || !id) return; const { error } = await follow(me, id); if (!error) setShowFollow(false); }}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' }}>
              <Text>Follow</Text>
            </Pressable>
          ) : <View />}
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{profile?.display_name || 'User'}</Text>
          {profile?.verified ? <VerifiedBadge size={16} /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#666' }}>@{profile?.username || 'user'}</Text>
          {followsYou ? <Text style={{ color: '#007aff', backgroundColor: '#eaf2ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>Follows you</Text> : null}
        </View>
        {profile?.bio ? <Text style={{ marginTop: 8 }}>{profile.bio}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {profile?.location ? (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Ionicons name="location-outline" size={14} color="#666" /><Text style={{ color: '#666' }}>{profile.location}</Text>
            </View>
          ) : null}
          {profile?.website ? (
            <Pressable onPress={() => openWebsite(profile.website)}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Ionicons name="link-outline" size={14} color="#666" /><Text style={{ color: '#666', textDecorationLine: 'underline' }}>{profile.website}</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}><Text style={{ fontWeight: '700' }}>{formatCount(counts.following)}</Text><Text style={{ color: '#666' }}>Following</Text></View>
          <View style={{ flexDirection: 'row', gap: 6 }}><Text style={{ fontWeight: '700' }}>{formatCount(counts.followers)}</Text><Text style={{ color: '#666' }}>Followers</Text></View>
          <View style={{ flexDirection: 'row', gap: 6 }}><Text style={{ fontWeight: '700' }}>{formatCount(counts.totalLikes)}</Text><Text style={{ color: '#666' }}>Likes</Text></View>
        </View>
      </View>
    </View>
  );

  const tabs = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
      <TabLink t="posts" label="Posts" />
      <TabLink t="videos" label="Videos" />
      <TabLink t="reposts" label="Reposts" />
      <TabLink t="reviews" label="Reviews" />
      <TabLink t="tags" label="Tags" />
    </View>
  );

  const list = tab === 'posts'
    ? posts
    : tab === 'videos' ? posts.filter(p => p.is_video)
    : tab === 'reposts' ? reposts
    : [];

  return (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        {header}
        {tabs}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {list.map(p => (
            <View key={p.id} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              {p.media_urls.map((u, i) => (
                <Image key={i} source={{ uri: u }} style={{ width: '100%', height: 320, borderRadius: 8 }} />
              ))}
              {p.caption ? <Text style={{ marginTop: 8 }}>{p.caption}</Text> : null}
            </View>
          ))}
          {(tab === 'reviews' || tab === 'tags') && (
            <Text style={{ color: '#666', marginTop: 20 }}>Coming soon.</Text>
          )}
        </View>
      </ScrollView>
      )}
<NavBar />
    </View>
  );
}
