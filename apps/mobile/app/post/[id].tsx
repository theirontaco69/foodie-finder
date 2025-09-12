
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';
import AuthorHeader from '../components/AuthorHeader';
import Comments from '../components/Comments';

type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string; likes_count?:number|null };

export default function PostScreen(){
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post,setPost]=useState<Post|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  async function load(){
    setLoading(true);
    const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at,likes_count').eq('id', String(id)).maybeSingle();
    setPost(r.data as any || null);
    setLoading(false);
  }

  useEffect(()=>{ if(id) load(); },[id]);
  const onRefresh=async()=>{ setRefreshing(true); await load(); setRefreshing(false); };

  async function toggleLike(){
    const u=await supabase.auth.getUser();
    const me=u?.data?.user?.id||null;
    if(!me||!post) return;
    const liked=await supabase.from('post_likes').select('post_id').eq('post_id',post.id).eq('user_id',me).maybeSingle();
    if(liked.data){
      await supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',me);
      setPost(p=> p ? { ...p, likes_count: Math.max(0,(p.likes_count||0)-1) } : p);
    }else{
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: me });
      setPost(p=> p ? { ...p, likes_count: (p.likes_count||0)+1 } : p);
    }
  }

  async function doRepost(){
    const u=await supabase.auth.getUser();
    const me=u?.data?.user?.id||null;
    if(!me||!post) return;
    try{ await supabase.from('reposts').insert({ post_id: post.id, user_id: me }); }catch(e){}
  }

  return (
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{ padding:16, paddingBottom:120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading || !post ? (
          <View style={{ padding:16 }}><ActivityIndicator /></View>
        ) : (
          <View style={{ gap:12 }}>
            <AuthorHeader userId={post.author_id} />
            <View style={{ gap:8 }}>
              {(post.media_urls||[]).map((u,i)=>(
                <ExpoImage key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
              ))}
            </View>
            {post.caption ? <Text style={{ marginTop:8 }}>{post.caption}</Text> : null}
            <View style={{ flexDirection:'row', alignItems:'center', gap:24, marginTop:12 }}>
              <Pressable onPress={()=>{}} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111" />
                <Text>Comment</Text>
              </Pressable>
              <Pressable onPress={doRepost} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Ionicons name="repeat-outline" size={20} color="#111" />
                <Text>Repost</Text>
              </Pressable>
              <Pressable onPress={toggleLike} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Ionicons name="heart-outline" size={20} color="#111" />
                <Text>{post.likes_count ?? 0}</Text>
              </Pressable>
            </View>
            <Comments postId={String(id)} />
          </View>
        )}
      </ScrollView>
      <NavBar />
    </View>
  );
}
