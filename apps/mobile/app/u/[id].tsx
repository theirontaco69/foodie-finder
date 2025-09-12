
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';

type Profile = { id:string; username:string|null; display_name:string|null; bio:string|null; location:string|null; website:string|null; avatar_url:string|null; banner_url:string|null; verified:boolean|null; created_at:string|null };

export default function PublicProfile(){
  const { id } = useLocalSearchParams<{id:string}>();
  const router=useRouter();
  const [p,setP]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true);
  const [meId,setMeId]=useState<string|null>(null);
  const [followers,setFollowers]=useState(0);
  const [following,setFollowing]=useState(0);
  const [isFollowing,setIsFollowing]=useState(false);

  useEffect(()=>{(async()=>{const s=await supabase.auth.getSession();setMeId(s.data?.session?.user?.id??null)})()},[]);
  async function load(){
    setLoading(true);
    const r=await supabase.from('user_profiles').select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at').eq('id',String(id)).maybeSingle();
    if(r.data) setP(r.data as any);
    const a=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('followee_id',String(id));
    const b=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',String(id));
    setFollowers(a.count||0); setFollowing(b.count||0);
    if(meId){ const f=await supabase.from('follows').select('id').eq('follower_id',meId).eq('followee_id',String(id)).maybeSingle(); setIsFollowing(!!f.data) }
    setLoading(false)
  }
  useEffect(()=>{ if(id) load() },[id,meId]);

  async function toggleFollow(){
    if(!meId||!id||meId===id) return;
    if(isFollowing){ await supabase.from('follows').delete().eq('follower_id',meId).eq('followee_id',String(id)) }
    else { await supabase.from('follows').insert({ follower_id:meId, followee_id:String(id) }) }
    await load()
  }

  if(loading) return <View style={{ flex:1, paddingBottom:96 }}><TopBar /><View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View><NavBar/></View>;
  if(!p) return <View style={{ flex:1, paddingBottom:96 }}><TopBar /><View style={{ padding:16 }}><Text>Profile not found.</Text></View><NavBar/></View>;

  return (
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom:120 }}>
        <View style={{ width:'100%', aspectRatio:3, backgroundColor:'#e9ecef' }}>
          <ExpoImage source={p.banner_url ? { uri: p.banner_url } : undefined} contentFit="cover" style={{ width:'100%', height:'100%' }} />
        </View>
        <View style={{ paddingHorizontal:16, marginTop:-36, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end' }}>
          <View style={{ borderRadius:40, overflow:'hidden', width:80, height:80, borderWidth:3, borderColor:'#fff', backgroundColor:'#eee' }}>
            <ExpoImage source={p.avatar_url ? { uri: p.avatar_url } : undefined} contentFit="cover" style={{ width:'100%', height:'100%' }} />
          </View>
          {meId && meId!==p.id ? (
            <Pressable onPress={toggleFollow} style={{ paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:'#ddd', borderRadius:20, backgroundColor:'#fff' }}>
              <Text style={{ fontWeight:'600' }}>{isFollowing ? 'Following' : 'Follow'}</Text>
            </Pressable>
          ):(
            <Pressable onPress={()=>router.back()} style={{ paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:'#ddd', borderRadius:20, backgroundColor:'#fff' }}>
              <Text style={{ fontWeight:'600' }}>Back</Text>
            </Pressable>
          )}
        </View>
        <View style={{ paddingHorizontal:16, paddingTop:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Text style={{ fontSize:20, fontWeight:'700' }}>{p.display_name||'User'}</Text>
            {p.verified ? <VerifiedBadge size={16}/> : null}
          </View>
          <Text style={{ color:'#666' }}>@{p.username||'user'}</Text>
          {p.bio ? <Text style={{ marginTop:8 }}>{p.bio}</Text> : null}
          <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
            <Text><Text style={{ fontWeight:'700' }}>{following}</Text> Following</Text>
            <Text><Text style={{ fontWeight:'700' }}>{followers}</Text> Followers</Text>
          </View>
        </View>
      </ScrollView>
      <NavBar />
    </View>
  )
}
