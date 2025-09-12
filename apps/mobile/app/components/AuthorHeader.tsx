
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';
import VerifiedBadge from './VerifiedBadge';
import { getProfileFromCache, setProfileInCache, type Profile as CachedProfile } from '../../lib/profileCache';

type Profile = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; verified:boolean|null; avatar_version?:number|null };

export default function AuthorHeader({ userId, initial }: { userId: string; initial?: CachedProfile | null; }) {
  const router = useRouter();
  const cached = initial ? { id: initial.id, username: initial.username, display_name: initial.display_name, avatar_url: initial.avatar_url } as any : (getProfileFromCache(userId) as any) ?? null;
  const [p,setP]=useState<Profile|null>(cached ? { ...cached, verified: (cached as any).verified ?? null } : null);
  const [avatar,setAvatar]=useState<string>('');

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      let prof: any = null;
      const r1=await supabase.from('user_profiles').select('id,username,display_name,avatar_url,verified,avatar_version').eq('id',userId).maybeSingle();
      if(r1.data) prof=r1.data;
      if(!prof){
        const r2=await supabase.from('profiles').select('id,username,display_name,avatar_url,verified:is_verified,avatar_version').eq('id',userId).maybeSingle();
        if(r2.data) prof=r2.data;
      }
      if(cancelled) return;
      if(prof){
        const normalized:Profile={ id:prof.id, username:prof.username, display_name:prof.display_name, avatar_url:prof.avatar_url, verified:prof.verified??null, avatar_version:prof.avatar_version??undefined };
        setP(normalized);
        setProfileInCache({ id: normalized.id, username: normalized.username, display_name: normalized.display_name, avatar_url: normalized.avatar_url });
        const finalUrl=resolveAvatarPublicUrl(supabase, normalized.avatar_url, { userId: normalized.id, version: normalized.avatar_version }) ?? (normalized.display_name||normalized.username ? fallbackAvatar(normalized.display_name||normalized.username) : '');
        setAvatar(finalUrl||'');
      } else {
        setP(null);
        setAvatar('');
      }
    })();
    return ()=>{cancelled=true};
  },[userId]);

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
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Text style={{ fontWeight:'600' }}>{name}</Text>
          {p?.verified ? <VerifiedBadge size={14} /> : null}
        </View>
        <Text style={{ color:'#666', fontSize:12 }}>{username}</Text>
      </View>
    </Pressable>
  );
}
