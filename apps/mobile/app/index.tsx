
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import AuthorHeader from './components/AuthorHeader';

type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };

export default function HomeFeed(){
  const router = useRouter();
  const [posts,setPosts]=useState<Post[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [liking,setLiking]=useState<string|null>(null);

  async function load(){
    setLoading(true);
    try{
      const { data, error } = await supabase
        .from('posts')
        .select('id,author_id,is_video,media_urls,caption,created_at,likes_count')
        .order('created_at',{ascending:false})
        .limit(100);
      if(error){ console.log('feed load error', error.message); setPosts([]); }
      else setPosts(Array.isArray(data)?data:[]);
    }catch(e){ console.log('feed load exception', e?.message||String(e)); setPosts([]); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); },[]);
  const onRefresh=async()=>{ setRefreshing(true); await load(); setRefreshing(false); };

  return(
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{ padding:16, paddingBottom:120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? <Text>Loading…</Text> : posts.length===0 ? <Text>No posts yet.</Text> : (
          <View style={{ gap:16 }}>
            {posts.map(p=>(
              <View key={p.id} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }}>
                <AuthorHeader userId={p.author_id} />
                <View style={{ height:8 }} />
                <View style={{ gap:8 }}>
                  {(p.media_urls||[]).map((u,i)=>(
                    <ExpoImage key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
                  ))}
                </View>
                {p.caption ? <Text style={{ marginTop:8 }}>{p.caption}</Text> : null}
                <View style={{ flexDirection:'row', alignItems:'center', gap:24, marginTop:12 }}>
                  <Pressable onPress={()=>router.push('/post/'+p.id)} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111" />
                    <Text>Comment</Text>
                  </Pressable>
                  <Pressable onPress={()=>toggleLike(p.id)} disabled={liking===p.id} style={{ flexDirection:'row', alignItems:'center', gap:6, opacity: liking===p.id?0.5:1 }}>
                    <Ionicons name="heart-outline" size={20} color="#111" />
                    <Text>{(p as any).likes_count??0}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <NavBar />
    </View>
  );
}
