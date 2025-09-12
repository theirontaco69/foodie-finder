import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '../lib/supabase';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import AuthorHeader from './components/AuthorHeader';

type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };

export default function HomeFeed(){
  const [posts,setPosts]=useState<Post[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  async function load(){
    setLoading(true);
    const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').order('created_at',{ascending:false}).limit(100);
    setPosts(Array.isArray(r.data)?r.data:[]);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);
  const onRefresh=async()=>{setRefreshing(true);await load();setRefreshing(false);};

  return(
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ padding:16, paddingBottom:120 }}>
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
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <NavBar />
    </View>
  );
}
