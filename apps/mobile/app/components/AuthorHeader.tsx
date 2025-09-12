import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';
import VerifiedBadge from './VerifiedBadge';

type P = { id:string; display_name:string|null; username:string|null; avatar_url:string|null; avatar_version?:number|null; verified:boolean|null };

export default function AuthorHeader({ userId, initial }:{ userId:string; initial?:P|null }) {
  const router=useRouter();
  const [p,setP]=useState<P|null>(initial??null);
  const [avatar,setAvatar]=useState<string|undefined>(undefined);

  useEffect(()=>{ let cancelled=false;
    (async()=>{
      if(!p){
        const r=await supabase.from('user_profiles').select('id,display_name,username,avatar_url,avatar_version,verified').eq('id',userId).maybeSingle();
        if(!cancelled && r.data) setP(r.data as any);
      }
    })();
    return()=>{cancelled=true};
  },[userId]);

  useEffect(()=>{
    const url=resolveAvatarPublicUrl(supabase, p?.avatar_url??null, { userId: p?.id??undefined, version: p?.avatar_version??undefined }) ?? (p?.display_name||p?.username ? fallbackAvatar(p?.display_name||p?.username) : undefined);
    setAvatar(url||undefined);
  },[p?.avatar_url,p?.avatar_version,p?.id,p?.display_name,p?.username]);

  const name=p?.display_name||'User';
  const handle= p?.username ? '@'+p.username : '@user';

  return (
    <Pressable onPress={()=>router.push('/u/'+userId)} style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
      <View style={{ width:36, height:36, borderRadius:18, overflow:'hidden', backgroundColor:'#eee' }}>
        {avatar ? <ExpoImage source={{ uri: avatar }} style={{ width:'100%', height:'100%' }} contentFit="cover" /> : null}
      </View>
      <View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Text style={{ fontWeight:'700' }}>{name}</Text>
          {p?.verified ? <VerifiedBadge size={14}/> : null}
        </View>
        <Text style={{ color:'#666' }}>{handle}</Text>
      </View>
    </Pressable>
  );
}
