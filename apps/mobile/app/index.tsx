import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import AuthorHeader from './components/AuthorHeader';

type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string; likes_count?:number|null };
type Profile = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; avatar_version?:number|null; verified?:boolean|null };

export default function HomeFeed(){
  const router=useRouter();
  const [posts,setPosts]=useState<Post[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [liked,setLiked]=useState<Record<string,boolean>>({});
  const [likesCount,setLikesCount]=useState<Record<string,number>>({});
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  async function load(){
    setLoading(true);
    const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at,likes_count').order('created_at',{ascending:false}).limit(100);
    const list=Array.isArray(r.data)?r.data:[];
    setPosts(list);
    const ids=[...new Set(list.map(x=>x.author_id).filter(Boolean))];
    if(ids.length){
      const pr=await supabase.from('user_profiles').select('id,username,display_name,avatar_url,avatar_version,verified').in('id',ids);
      const map={}; (pr.data||[]).forEach((x:any)=>{ map[x.id]=x; });
      setProfiles(map);
    }else{
      setProfiles({});
    }
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(me && list.length){
      const likeRes=await supabase.from('post_likes').select('post_id').in('post_id', list.map(x=>x.id)).eq('user_id', me);
      const likedNow:Record<string,boolean>={}; (likeRes.data||[]).forEach((x:any)=>{ likedNow[x.post_id]=true; });
      setLiked(likedNow);
    }else{
      setLiked({});
    }
    const countsNow:Record<string,number>={}; list.forEach(x=>{ countsNow[x.id]=Number(x.likes_count||0); }); setLikesCount(countsNow);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);
  const onRefresh=async()=>{setRefreshing(true);await load();setRefreshing(false);};

  async function toggleLike(postId:string){
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(!me) return;
    const on=!!liked[postId];
    setLiked(prev=>({ ...prev, [postId]: !on }));
    setLikesCount(prev=>({ ...prev, [postId]: Math.max(0,(prev[postId]||0) + (on?-1:1)) }));
    if(on){
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', me);
    }else{
      await supabase.from('post_likes').insert({ post_id: postId, user_id: me });
    }
  }

  return(
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? <Text>Loading…</Text> : posts.length===0 ? <Text>No posts yet.</Text> : (
          <View style={{ gap:16 }}>
            {posts.map(p=>(
              <View key={p.id} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }}>
                <AuthorHeader userId={p.author_id} initial={profiles[p.author_id]||null} />
                <View style={{ height:8 }} />
                <View style={{ gap:8 }}>
                  {(p.media_urls||[]).map((u,i)=>(
                    <ExpoImage key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
                  ))}
                </View>
                {p.caption ? <Text style={{ marginTop:8 }}>{p.caption}</Text> : null}
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:12 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:18 }}>
                    <Pressable onPress={()=>router.push('/post/'+p.id)} accessibilityLabel="Comments">
                      <Ionicons name="chatbubble-ellipses-outline" size={22} color="#111" />
                    </Pressable>
                    <Pressable onPress={()=>router.push('/compose?repost='+p.id)} accessibilityLabel="Repost">
                      <Ionicons name="repeat-outline" size={22} color="#111" />
                    </Pressable>
                    <Pressable onPress={()=>toggleLike(p.id)} accessibilityLabel="Like">
                      <Ionicons name={liked[p.id] ? 'heart' : 'heart-outline'} size={22} color={liked[p.id] ? '#e0245e' : '#111'} />
                    </Pressable>
                  </View>
                  <Text>{likesCount[p.id]||0}</Text>
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
