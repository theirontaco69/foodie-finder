import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import AuthorHeader from './components/AuthorHeader';

type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string; likes_count?:number|null };

export default function HomeFeed(){
  const router=useRouter();
  const [posts,setPosts]=useState<Post[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [likeCounts,setLikeCounts]=useState<Record<string,number>>({});
  const [liked,setLiked]=useState<Record<string,boolean>>({});

  async function load(){
    setLoading(true);
    const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at,likes_count').order('created_at',{ascending:false}).limit(100);
    const list=Array.isArray(r.data)?r.data:[];
    setPosts(list);
    const lc:Record<string,number>={}; list.forEach(p=>{lc[p.id]=Number(p.likes_count||0)});
    setLikeCounts(lc);
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(me && list.length){
      const lr=await supabase.from('post_likes').select('post_id').in('post_id',list.map(x=>x.id)).eq('user_id',me);
      const map:Record<string,boolean>={}; (lr.data||[]).forEach((x:any)=>{map[x.post_id]=true});
      setLiked(map);
    } else setLiked({});
    setLoading(false);
  }

  useEffect(()=>{load();},[]);
  const onRefresh=async()=>{setRefreshing(true);await load();setRefreshing(false);};

  async function toggleLike(postId:string){
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(!me) return;
    const on=!!liked[postId];
    setLiked(prev=>({...prev,[postId]:!on}));
    setLikeCounts(prev=>({...prev,[postId]:Math.max(0,(prev[postId]||0)+(on?-1:1))}));
    if(on){
      await supabase.from('post_likes').delete().eq('post_id',postId).eq('user_id',me);
    }else{
      await supabase.from('post_likes').insert({ post_id:postId, user_id:me });
    }
  }

  async function repost(postId:string){
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(!me) return;
    await supabase.from('reposts').insert({ post_id:postId, user_id:me });
  }

  return(
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
                  <Pressable onPress={()=>router.push('/post/'+p.id)}><Ionicons name="chatbubble-ellipses-outline" size={22} color="#111" /></Pressable>
                  <Pressable onPress={()=>repost(p.id)}><Ionicons name="repeat-outline" size={22} color="#111" /></Pressable>
                  <Pressable onPress={()=>toggleLike(p.id)} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <Ionicons name={liked[p.id]?'heart':'heart-outline'} size={22} color={liked[p.id]?'#e0245e':'#111'} />
                    <Text>{likeCounts[p.id]||0}</Text>
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
