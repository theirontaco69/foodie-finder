import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import VideoPlayer from './components/VideoPlayer';
import LikeButton from './components/LikeButton';
import BookmarkButton from './components/BookmarkButton';
import Comments from './components/Comments';
import NavBar from './components/NavBar';
import TopBar from './components/TopBar';
import AuthorHeader from './components/AuthorHeader';
import type { Profile } from '../lib/profileCache';

type PostRec = {
  id: string;
  author_id: string;
  caption: string | null;
  is_video: boolean;
  media_urls: string[];
  created_at: string;
  profiles?: Profile | null;
};

function normalizeAvatar(u?: string | null) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const r = supabase.storage.from('media').getPublicUrl(u);
  return r?.data?.publicUrl || '';
}

export default function HomeFeed() {
  const [posts, setPosts] = useState<PostRec[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  async function load() {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from('posts')
      .select('id, author_id, caption, is_video, media_urls, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { setErr(error.message || 'Error loading feed'); setPosts([]); setLoading(false); return; }
    const rows = (data || []) as PostRec[];

    const ids = Array.from(new Set(rows.map(r => r.author_id))).filter(Boolean) as string[];
    let map: Record<string, Profile> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', ids);
      if (profs) {
        for (const p of profs) {
          map[p.id] = {
            id: p.id,
            display_name: p.display_name,
            username: p.username,
            avatar_url: normalizeAvatar(p.avatar_url),
          };
        }
      }
    }

    const merged = rows.map(r => ({ ...r, profiles: map[r.author_id] || null }));
    setPosts(merged);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false()); };

  const renderItem = ({ item }: { item: PostRec }) => (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
      <AuthorHeader userId={item.author_id} initial={item.profiles} />
      <View style={{ gap: 8 }}>
        {item.is_video
          ? item.media_urls.map((u, i) => <VideoPlayer key={i} uri={u} />)
          : item.media_urls.map((u, i) => (
              <Image
                key={i}
                source={{ uri: u }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#f3f3f3' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
              />
            ))
        }
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <LikeButton postId={item.id} />
        <BookmarkButton postId={item.id} />
      </View>
      {item.caption ? <Text style={{ marginTop: 4 }}>{item.caption}</Text> : null}
      <Comments postId={item.id} />
    </View>
  );

  const emptyState = (
    <View style={{ padding: 16 }}>
      {err ? <Text style={{ color: 'red' }}>{err}</Text> : <Text style={{ color: '#666' }}>No posts yet.</Text>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar />
      <Animated.FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loading ? null : emptyState}
        contentContainerStyle={{ paddingBottom: 140 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        initialNumToRender={8}
      />
      <NavBar scrollY={scrollY} />
    </View>
  );
}
