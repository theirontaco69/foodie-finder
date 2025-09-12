
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

  useEffect(()=>{ if(initial) setP(initial); },[userId]);

  useEffect(()=>{ (async()=>{
    if(!p){
      const r=await supabase.from('profiles').select('id,display_name,username,avatar_url,avatar_version').eq('id',userId).maybeSingle();
      if(r.data) setP(r.data as any);
    }
  })(); },[userId]);

  const name=p?.display_name || p?.username || 'User';
  const username=p?.username ? '@'+p.username : '@user';
  const avatar=resolveAvatarPublicUrl(supabase, p?.avatar_url??null, { userId, version: p?.avatar_version??undefined }) ?? (p?.display_name||p?.username ? fallbackAvatar(p?.display_name||p?.username) : null);

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
