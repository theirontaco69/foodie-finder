
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, RefreshControl, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import AuthorHeader from './components/AuthorHeader';

type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };
type Prof = { id:string; display_name:string|null; username:string|null; avatar_url:string|null; avatar_version?:number|null };

export default function HomeFeed(){
  const [meId,setMeId]=useState<string|null>(null);
  const [active,setActive]=useState<'ForYou'|'Local'|'Following'>('ForYou');
  const [posts,setPosts]=useState<Post[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Prof|null>>({});
  const [refreshing,setRefreshing]=useState(false);

  useEffect(()=>{(async()=>{const s=await supabase.auth.getSession(); setMeId(s.data?.session?.user?.id??null);})();},[]);

  const load=useCallback(async()=>{
    let list:Post[]=[];
    if(active==='Following' && meId){
      const f=await supabase.from('follows').select('followee_id').eq('follower_id',meId).limit(1000);
      const ids=(f.data||[]).map((x:any)=>x.followee_id);
      if(ids.length===0){ setPosts([]); setProfiles({}); return; }
      const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').in('author_id',ids).order('created_at',{ascending:false}).limit(100);
      list=(r.data as any)||[];
    }else{
      const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').order('created_at',{ascending:false}).limit(100);
      list=(r.data as any)||[];
    }
    setPosts(list);
    const ids=Array.from(new Set(list.map(x=>x.author_id)));
    if(ids.length){
      const pr=await supabase.from('user_profiles').select('id,display_name,username,avatar_url,avatar_version').in('id',ids);
      const map:Record<string,Prof|null>={}; (pr.data||[]).forEach((d:any)=>{ map[d.id]={ id:d.id, display_name:d.display_name, username:d.username, avatar_url:d.avatar_url, avatar_version:d.avatar_version };});
      setProfiles(map);
    }else{
      setProfiles({});
    }
  },[active,meId]);

  useEffect(()=>{load();},[load]);

  const onRefresh=useCallback(async()=>{ setRefreshing(true); await load(); setRefreshing(false); },[load]);

  return (
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom:120 }}>
        <View style={{ paddingHorizontal:16, paddingTop:10, flexDirection:'row', gap:18 }}>
          <Pressable onPress={()=>setActive('ForYou')}><Text style={{ fontWeight: active==='ForYou' ? '700' : '500' }}>For You</Text></Pressable>
          <Pressable onPress={()=>setActive('Local')}><Text style={{ fontWeight: active==='Local' ? '700' : '500' }}>Local</Text></Pressable>
          <Pressable onPress={()=>setActive('Following')}><Text style={{ fontWeight: active==='Following' ? '700' : '500' }}>Following</Text></Pressable>
        </View>
        <View style={{ height:10 }} />
        {posts.length===0 ? (
          <View style={{ paddingHorizontal:16 }}><Text style={{ color:'#666' }}>No posts yet.</Text></View>
        ) : (
          <View style={{ paddingHorizontal:16, gap:16 }}>
            {posts.map(p=>(
              <View key={p.id} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }}>
                <AuthorHeader userId={p.author_id} initial={profiles[p.author_id]||null} />
                <View style={{ height:8 }} />
                <View style={{ gap:8 }}>
                  {p.media_urls.map((u,i)=>(
                    <Image key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8 }} contentFit="cover" />
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
