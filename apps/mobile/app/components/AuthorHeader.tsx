
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';
import VerifiedBadge from './VerifiedBadge';

type P = { id:string; display_name:string|null; username:string|null; avatar_url:string|null; avatar_version?:number|null; verified:boolean|null };

export default function AuthorHeader({ userId }:{ userId:string }){
  const router=useRouter();
  const [p,setP]=useState<P|null>(null);
  const [avatar,setAvatar]=useState<string>('');

  useEffect(()=>{
    let cancel=false;
    (async()=>{
      const r=await supabase.from('user_profiles').select('id,display_name,username,avatar_url,avatar_version,verified').eq('id',userId).maybeSingle();
      if(cancel) return;
      if(r.data){
        setP(r.data as any);
        const a=resolveAvatarPublicUrl(supabase, r.data.avatar_url??null, { userId, version:(r.data as any).avatar_version }) ?? fallbackAvatar((r.data.display_name||r.data.username)||null);
        setAvatar(a||'');
      }
    })();
    return ()=>{ cancel=true };
  },[userId]);

  const name=p?.display_name||'User';
  const username=p?.username?('@'+p.username):'@user';

  return (
    <Pressable onPress={()=>router.push('/u/'+userId)} style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
      {avatar ? <ExpoImage source={{ uri: avatar }} style={{ width:36, height:36, borderRadius:18, backgroundColor:'#eee' }} contentFit="cover" /> : <View style={{ width:36, height:36, borderRadius:18, backgroundColor:'#eee' }} />}
      <View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Text style={{ fontWeight:'600' }}>{name}</Text>
          {p?.verified ? <VerifiedBadge size={14} /> : null}
        </View>
        <Text style={{ color:'#666', fontSize:12 }}>{username}</Text>
      </View>
    </Pressable>
  );
}
