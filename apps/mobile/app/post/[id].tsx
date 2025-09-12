
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AuthorHeader from '../components/AuthorHeader';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';

type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };

export default function PostDetail(){
  const { id } = useLocalSearchParams<{id:string}>();
  const router=useRouter();
  const [p,setP]=useState<Post|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').eq('id',String(id)).maybeSingle(); setP(r.data as any||null); setLoading(false)})()},[id]);

  async function repost(){
    try{ await supabase.rpc('repost_post',{ post_id:String(id) }); Alert.alert('Reposted') }catch(e){ Alert.alert('Repost failed') }
  }

  if(loading) return <View style={{ flex:1, paddingBottom:96 }}><TopBar /><View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View><NavBar/></View>;
  if(!p) return <View style={{ flex:1, paddingBottom:96 }}><TopBar /><View style={{ padding:16 }}><Text>Post not found.</Text></View><NavBar/></View>;

  return (
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:120 }}>
        <Pressable onPress={()=>router.back()} style={{ marginBottom:8 }}><Text style={{ color:'#06f' }}>Back</Text></Pressable>
        <AuthorHeader userId={p.author_id} />
        <View style={{ height:8 }} />
        <View style={{ gap:8 }}>
          {(p.media_urls||[]).map((u,i)=>(
            <ExpoImage key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
          ))}
        </View>
        {p.caption ? <Text style={{ marginTop:8 }}>{p.caption}</Text> : null}
        <View style={{ flexDirection:'row', alignItems:'center', gap:24, marginTop:12 }}>
          <Pressable onPress={()=>{}} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111" />
            <Text>Comment</Text>
          </Pressable>
          <Pressable onPress={repost} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="repeat-outline" size={20} color="#111" />
            <Text>Repost</Text>
          </Pressable>
        </View>
      </ScrollView>
      <NavBar />
    </View>
  )
}
