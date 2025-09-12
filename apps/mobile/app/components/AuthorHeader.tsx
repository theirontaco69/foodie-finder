import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { resolveAvatarPublicUrl, fallbackAvatar } from '../../lib/avatar';

type Profile = { id:string; display_name:string|null; username:string|null; avatar_url:string|null; avatar_version?:number|null; verified?:boolean|null };

export default function AuthorHeader({ userId }: { userId: string }) {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled=false;
    (async()=>{
      const r=await supabase.from('user_profiles').select('id,display_name,username,avatar_url,avatar_version,verified').eq('id',userId).maybeSingle();
      if(cancelled) return;
      if(r.data){ 
        setP(r.data as any);
        const u=resolveAvatarPublicUrl(supabase, r.data.avatar_url??null, { userId, version: r.data.avatar_version??undefined }) ?? (r.data.display_name||r.data.username ? fallbackAvatar(r.data.display_name||r.data.username) : null);
        setFinalUrl(u??null);
      } else {
        setP(null);
        setFinalUrl(null);
      }
    })();
    return()=>{cancelled=true};
  }, [userId]);

  const name = p?.display_name || 'User';
  const username = p?.username ? '@' + p.username : '@user';

  return (
    <Pressable onPress={() => router.push('/u/'+userId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {finalUrl ? (
        <ExpoImage
          source={{ uri: finalUrl }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }} />
      )}
      <View>
        <Text style={{ fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: '#666', fontSize: 12 }}>{username}</Text>
      </View>
    </Pressable>
  );
}
