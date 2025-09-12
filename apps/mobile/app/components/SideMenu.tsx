import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, SafeAreaView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';
import VerifiedBadge from './VerifiedBadge';

type Profile = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; avatar_version?:number|null; verified:boolean|null };

export default function SideMenu({ open, onClose }:{ open:boolean; onClose:()=>void }) {
  const router=useRouter();
  const [meId,setMeId]=useState<string|null>(null);
  const [p,setP]=useState<Profile|null>(null);
  const [counts,setCounts]=useState({following:0,followers:0,likes:0});
  const [loading,setLoading]=useState(true);

  async function load(uid:string){
    setLoading(true);
    const prof=await supabase.from('user_profiles').select('id,username,display_name,avatar_url,avatar_version,verified').eq('id',uid).maybeSingle();
    if(prof.data) setP(prof.data as any);
    const a=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',uid);
    const b=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('followee_id',uid);
    const t=await supabase.rpc('total_likes_received',{author:uid});
    setCounts({following:a.count||0,followers:b.count||0,likes:Number(t.data??0)});
    setLoading(false);
  }

  useEffect(()=>{(async()=>{const s=await supabase.auth.getSession();const uid=s?.data?.session?.user?.id??null;setMeId(uid);if(uid) load(uid); else setLoading(false);})();},[]);
  useEffect(()=>{const sub=supabase.auth.onAuthStateChange((_e,session)=>{const uid=session?.user?.id??null;setMeId(uid);if(uid) load(uid); else {setP(null);setCounts({following:0,followers:0,likes:0});setLoading(false);} });return()=>{sub.data.subscription.unsubscribe();};},[]);

  function nav(path:string){ onClose(); router.push(path as any); }
  async function logout(){ await supabase.auth.signOut(); onClose(); router.replace('/login'); }

  const avatar=resolveAvatarPublicUrl(supabase, p?.avatar_url??null, { userId: p?.id??undefined, version: p?.avatar_version??undefined }) ?? (p?.display_name||p?.username ? fallbackAvatar(p?.display_name||p?.username) : null);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
      <View style={{ paddingHorizontal:16, paddingTop:8, flex:1 }}>
        {loading ? (
          <View style={{ alignItems:'center', justifyContent:'center', padding:20 }}><ActivityIndicator/></View>
        ) : meId && p ? (
          <View style={{ gap:16 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
              <View style={{ width:56, height:56, borderRadius:28, overflow:'hidden', backgroundColor:'#eee' }}>
                {avatar ? <ExpoImage source={{ uri: avatar }} style={{ width:'100%', height:'100%' }} contentFit="cover" /> : null}
              </View>
              <View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <Text style={{ fontSize:18, fontWeight:'700' }}>{p.display_name||'User'}</Text>
                  {p.verified ? <VerifiedBadge size={16}/> : null}
                </View>
                <Text style={{ color:'#666' }}>@{p.username||'user'}</Text>
              </View>
            </View>

            <View style={{ flexDirection:'row', gap:16 }}>
              <Text><Text style={{ fontWeight:'700' }}>{counts.following}</Text> Following</Text>
              <Text><Text style={{ fontWeight:'700' }}>{counts.followers}</Text> Followers</Text>
              <Text><Text style={{ fontWeight:'700' }}>{counts.likes}</Text> Likes</Text>
            </View>

            <View style={{ height:8 }} />
            <Pressable onPress={()=>nav('/profile')} style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:12 }}>
              <Ionicons name="person-outline" size={22} color="#111" /><Text style={{ fontSize:16 }}>Profile</Text>
            </Pressable>
            <Pressable onPress={()=>nav('/search')} style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:12 }}>
              <Ionicons name="search-outline" size={22} color="#111" /><Text style={{ fontSize:16 }}>Search</Text>
            </Pressable>
            <Pressable onPress={()=>nav('/compose')} style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:12 }}>
              <Ionicons name="add-circle-outline" size={22} color="#111" /><Text style={{ fontSize:16 }}>Upload</Text>
            </Pressable>
            <View style={{ height:8 }} />
            <Pressable onPress={logout} style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:12 }}>
              <Ionicons name="log-out-outline" size={22} color="#d00" /><Text style={{ fontSize:16, color:'#d00', fontWeight:'700' }}>Log out</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap:8 }}>
            <Text style={{ fontSize:18, fontWeight:'700' }}>Welcome</Text>
            <Pressable onPress={()=>nav('/login')} style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:12 }}>
              <Ionicons name="log-in-outline" size={22} color="#111" /><Text style={{ fontSize:16 }}>Log in</Text>
            </Pressable>
            <Pressable onPress={()=>nav('/login')} style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:12 }}>
              <Ionicons name="person-add-outline" size={22} color="#111" /><Text style={{ fontSize:16 }}>Create account</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
