
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';
import VerifiedBadge from './VerifiedBadge';

type Profile = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; verified:boolean|null; created_at:string|null; avatar_version?:number|null };

function Row({ icon, label, onPress }:{ icon:string; label:string; onPress:()=>void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:12 }}>
      <Ionicons name={icon as any} size={22} color="#111" />
      <Text style={{ fontSize:16 }}>{label}</Text>
    </Pressable>
  );
}

export default function SideMenu({ open, onClose }:{ open:boolean; onClose:()=>void }) {
  const router=useRouter();
  const [meId,setMeId]=useState<string|null>(null);
  const [p,setP]=useState<Profile|null>(null);
  const [counts,setCounts]=useState({following:0,followers:0,likes:0});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(r=>setMeId(r.data?.session?.user?.id??null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session)=>{ setMeId(session?.user?.id ?? null) });
    return ()=>{ sub.subscription.unsubscribe() };
  },[]);

  useEffect(()=>{
    (async()=>{
      if(!meId){ setP(null); setCounts({following:0,followers:0,likes:0}); setLoading(false); return }
      setLoading(true);
      const r=await supabase.from('user_profiles').select('id,username,display_name,avatar_url,verified,created_at,avatar_version').eq('id',meId).maybeSingle();
      if(r.data) setP(r.data as any);
      const a=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',meId);
      const b=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('followee_id',meId);
      const t=await supabase.from('post_likes').select('id,posts!inner(author_id)',{count:'exact',head:true}).eq('posts.author_id',meId);
      setCounts({following:a.count||0,followers:b.count||0,likes:t.count||0});
      setLoading(false);
    })();
  },[meId,open]);

  function nav(path:string){ onClose(); router.push(path as any) }
  async function logout(){ await supabase.auth.signOut(); onClose(); router.replace('/login') }

  const avatar=resolveAvatarPublicUrl(supabase, p?.avatar_url??null, { userId:p?.id??undefined, version:p?.avatar_version??undefined }) ?? (p?.display_name||p?.username ? fallbackAvatar(p?.display_name||p?.username) : null);

  return (
    <View style={{ flex:1, backgroundColor:'#fff', paddingTop:60, paddingHorizontal:16 }}>
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
          <Row icon="person-outline" label="Profile" onPress={()=>nav('/profile')} />
          <Row icon="search-outline" label="Search" onPress={()=>nav('/search')} />
          <Row icon="add-circle-outline" label="Upload" onPress={()=>nav('/compose')} />
          <View style={{ height:8 }} />
          <Row icon="log-out-outline" label="Log out" onPress={logout} />
        </View>
      ) : (
        <View style={{ gap:8 }}>
          <Text style={{ fontSize:18, fontWeight:'700' }}>Welcome</Text>
          <Row icon="log-in-outline" label="Log in" onPress={()=>nav('/login')} />
          <Row icon="person-add-outline" label="Create account" onPress={()=>nav('/login')} />
        </View>
      )}
    </View>
  );
}
