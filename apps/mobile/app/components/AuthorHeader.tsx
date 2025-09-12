
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
  const [p,setP]=useState<Profile|null>(initial ? { id: initial.id, username: initial.username, display_name: initial.display_name, avatar_url: initial.avatar_url, verified: (initial as any).verified ?? null } : (getProfileFromCache(userId) as any) ?? null);
  const [avatar,setAvatar]=useState<string>('');

  useEffect(()=>{
    (async()=>{
      const need=!p || p.display_name==null || p.username==null || p.avatar_url==null;
      if(need && userId){
        const r=await supabase.from('user_profiles').select('id,username,display_name,avatar_url,verified,avatar_version').eq('id',userId).maybeSingle();
        if(r.data){
          const prof={ id:r.data.id, username:r.data.username, display_name:r.data.display_name, avatar_url:r.data.avatar_url, verified:r.data.verified, avatar_version:(r.data as any).avatar_version } as Profile;
          setP(prof);
          setProfileInCache({ id:prof.id, username:prof.username, display_name:prof.display_name, avatar_url:prof.avatar_url });
          const url=resolveAvatarPublicUrl(supabase, prof.avatar_url, { userId: prof.id, version: prof.avatar_version }) ?? (prof.display_name||prof.username ? fallbackAvatar(prof.display_name||prof.username) : '');
          setAvatar(url||'');
        }
      } else if(p){
        const url=resolveAvatarPublicUrl(supabase, p.avatar_url, { userId: p.id, version: p.avatar_version }) ?? (p.display_name||p.username ? fallbackAvatar(p.display_name||p.username) : '');
        setAvatar(url||'');
      }
    })();
  },[userId, p?.avatar_url]);

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
