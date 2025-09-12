
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';

type P = { id:string; display_name:string|null; username:string|null; avatar_url:string|null; avatar_version?:number|null };

export default function AuthorHeader({ userId, initial }: { userId:string; initial?: P|null }) {
  const router=useRouter();
  const [p,setP]=useState<P|null>(initial??null);
  const [avatar,setAvatar]=useState<string>('');

  function setFrom(d:any){
    const u=resolveAvatarPublicUrl(supabase, d?.avatar_url??null, { userId, version:d?.avatar_version??undefined }) ?? (d?.display_name||d?.username ? fallbackAvatar(d.display_name||d.username) : '');
    setAvatar(u||'');
  }

  useEffect(()=>{ if(initial){ setP(initial); setFrom(initial); } },[userId]);

  useEffect(()=>{ let off=false; (async()=>{ const r=await supabase.from('user_profiles').select('id,display_name,username,avatar_url,avatar_version').eq('id',userId).maybeSingle(); if(off) return; if(r.data){ const d=r.data as any; const v:{id:string,display_name:string|null,username:string|null,avatar_url:string|null,avatar_version?:number|null}={id:d.id,display_name:d.display_name,username:d.username,avatar_url:d.avatar_url,avatar_version:d.avatar_version}; setP(v); setFrom(v); } })(); return()=>{off=true}; },[userId]);

  const name=p?.display_name||'User';
  const username=p?.username ? '@'+p.username : '@user';

  return (
    <Pressable onPress={()=>router.push('/u/'+userId)} style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
      {avatar ? (
        <ExpoImage source={{ uri: avatar }} style={{ width:36, height:36, borderRadius:18, backgroundColor:'#eee' }} contentFit="cover" />
      ) : (
        <View style={{ width:36, height:36, borderRadius:18, backgroundColor:'#eee' }} />
      )}
      <View>
        <Text style={{ fontWeight:'600' }}>{name}</Text>
        <Text style={{ color:'#666', fontSize:12 }}>{username}</Text>
      </View>
    </Pressable>
  );
}
