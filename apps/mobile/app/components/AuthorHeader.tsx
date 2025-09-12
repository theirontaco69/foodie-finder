import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';

type Profile={ id:string; display_name:string|null; username:string|null; avatar_url:string|null; avatar_version?:number|null; verified?:boolean|null };

export default function AuthorHeader({ userId, initial }: { userId:string; initial?:Profile|null }) {
  const router=useRouter();
  const [p,setP]=useState<Profile|null>(initial??null);
  const [url,setUrl]=useState<string|null>(null);

  useEffect(()=>{ if(initial){ const u=resolveAvatarPublicUrl(supabase, initial.avatar_url??null,{userId,version:initial.avatar_version??undefined})??(initial.display_name||initial.username?fallbackAvatar(initial.display_name||initial.username):null); setUrl(u??null);} },[initial?.avatar_url,initial?.avatar_version,initial?.display_name,initial?.username,userId]);

  useEffect(()=>{ let c=false;(async()=>{ const r=await supabase.from('user_profiles').select('id,display_name,username,avatar_url,avatar_version,verified').eq('id',userId).maybeSingle(); if(c) return; if(r.data){ setP(r.data as any); const u=resolveAvatarPublicUrl(supabase,r.data.avatar_url??null,{userId,version:r.data.avatar_version??undefined})??(r.data.display_name||r.data.username?fallbackAvatar(r.data.display_name||r.data.username):null); setUrl(u??null);} })(); return()=>{c=true}; },[userId]);

  const name=p?.display_name||'User';
  const handle=p?.username?'@'+p.username:'@user';

  return(
    <Pressable onPress={()=>router.push('/u/'+userId)} style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
      {url?<ExpoImage source={{ uri:url }} style={{ width:36, height:36, borderRadius:18, backgroundColor:'#eee' }} contentFit="cover" cachePolicy="memory-disk" transition={150} />:<View style={{ width:36, height:36, borderRadius:18, backgroundColor:'#eee' }} />}
      <View>
        <Text style={{ fontWeight:'600' }}>{name}</Text>
        <Text style={{ color:'#666', fontSize:12 }}>{handle}</Text>
      </View>
    </Pressable>
  );
}
