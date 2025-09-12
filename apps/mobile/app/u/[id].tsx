
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';

type Profile = { id:string; username:string|null; display_name:string|null; bio:string|null; location:string|null; website:string|null; avatar_url:string|null; banner_url:string|null; verified:boolean|null; created_at:string|null };
type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };

function abbreviate(n:number){ if(n<1000) return String(n); if(n<10000) return (Math.round(n/100)/10).toFixed(1).replace(/\.0$/,'')+'K'; if(n<1000000) return Math.round(n/1000)+'K'; if(n<10000000) return (Math.round(n/100000)/10).toFixed(1).replace(/\.0$/,'')+'M'; if(n<1000000000) return Math.round(n/1000000)+'M'; return '1B+' }
function formatJoined(s?:string|null){ if(!s) return ''; const d=new Date(s); return 'Joined '+d.toLocaleString('en-US',{month:'long',year:'numeric'}) }

export default function PublicProfile(){
  const { id } = useLocalSearchParams<{ id:string }>();
  const [me,setMe]=useState<string|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [counts,setCounts]=useState({following:0,followers:0,likes:0});
  const [posts,setPosts]=useState<Post[]>([]);
  const [following,setFollowing]=useState<boolean|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{ supabase.auth.getSession().then(r=>setMe(r.data?.session?.user?.id??null)) },[]);

  useEffect(()=>{
    if(!id) return;
    (async()=>{
      setLoading(true);
      const r=await supabase.from('user_profiles').select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at').eq('id',String(id)).maybeSingle();
      if(r.data) setProfile(r.data as any);
      const a=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',String(id));
      const b=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('followee_id',String(id));
      const t=await supabase.from('post_likes').select('id,posts!inner(author_id)',{count:'exact',head:true}).eq('posts.author_id',String(id));
      setCounts({following:a.count||0, followers:b.count||0, likes:t.count||0});
      const fp=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').eq('author_id',String(id)).order('created_at',{ascending:false}).limit(100);
      setPosts(Array.isArray(fp.data)?fp.data:[]);
      if(me){ const f=await supabase.from('follows').select('id').eq('follower_id',me).eq('followee_id',String(id)).maybeSingle(); setFollowing(!!f.data) }
      setLoading(false);
    })();
  },[id,me]);

  async function toggleFollow(){
    if(!me||!id) return;
    try{
      if(following){
        await supabase.from('follows').delete().eq('follower_id',me).eq('followee_id',String(id));
        setFollowing(false);
        setCounts(c=>({ ...c, followers: Math.max(0,c.followers-1) }));
      }else{
        await supabase.from('follows').insert({ follower_id:me, followee_id:String(id) });
        setFollowing(true);
        setCounts(c=>({ ...c, followers: c.followers+1 }));
      }
    }catch(e){ Alert.alert('Follow error', (e as any)?.message||'Failed') }
  }

  if(loading){
    return (
      <View style={{ flex:1, paddingBottom:96 }}>
        <TopBar />
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Loading…</Text></View>
        <NavBar />
      </View>
    )
  }

  if(!profile){
    return (
      <View style={{ flex:1, paddingBottom:96 }}>
        <TopBar />
        <View style={{ padding:16 }}><Text>Profile not found.</Text></View>
        <NavBar />
      </View>
    )
  }

  const isMe = me === profile.id;

  return (
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom:120 }}>
        <View style={{ width:'100%', aspectRatio:3, backgroundColor:'#e9ecef' }}>
          <ExpoImage source={profile.banner_url?{ uri:profile.banner_url }:undefined} contentFit="cover" style={{ width:'100%', height:'100%' }} />
        </View>

        <View style={{ paddingHorizontal:16, marginTop:-36, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end' }}>
          <View style={{ borderRadius:40, overflow:'hidden', width:80, height:80, borderWidth:3, borderColor:'#fff', backgroundColor:'#eee' }}>
            <ExpoImage source={profile.avatar_url?{ uri:profile.avatar_url }:undefined} contentFit="cover" style={{ width:'100%', height:'100%' }} />
          </View>

          {!isMe ? (
            <Pressable onPress={toggleFollow} style={{ paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:'#ddd', borderRadius:20, backgroundColor:'#fff' }}>
              <Text style={{ fontWeight:'600' }}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal:16, paddingTop:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Text style={{ fontSize:20, fontWeight:'700' }}>{profile.display_name||'User'}</Text>
            {profile.verified ? <VerifiedBadge size={16}/> : null}
          </View>
          <Text style={{ color:'#666' }}>@{profile.username||'user'}</Text>
          {profile.bio ? <Text style={{ marginTop:8 }}>{profile.bio}</Text> : null}

          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:14, marginTop:8, alignItems:'center' }}>
            {profile.location ? (
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Ionicons name="location-outline" size={14} color="#444" />
                <Text style={{ color:'#444' }}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.website ? (
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Ionicons name="link-outline" size={14} color="#444" />
                <Text style={{ color:'#0a7' }}>{profile.website}</Text>
              </View>
            ) : null}
            {profile.created_at ? (
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Ionicons name="calendar-outline" size={14} color="#444" />
                <Text style={{ color:'#444' }}>{formatJoined(profile.created_at)}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
            <Text><Text style={{ fontWeight:'700' }}>{abbreviate(counts.following)}</Text> Following</Text>
            <Text><Text style={{ fontWeight:'700' }}>{abbreviate(counts.followers)}</Text> Followers</Text>
            <Text><Text style={{ fontWeight:'700' }}>{abbreviate(counts.likes)}</Text> Likes</Text>
          </View>

          <View style={{ height:16 }} />
          {posts.length===0 ? <Text style={{ color:'#666' }}>No posts yet.</Text> : (
            <View style={{ gap:12 }}>
              {posts.map(p=>(
                <View key={p.id} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }}>
                  <View style={{ gap:8 }}>
                    {(p.media_urls||[]).map((u,i)=>(
                      <ExpoImage key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
                    ))}
                  </View>
                  {p.caption ? <Text style={{ marginTop:8 }}>{p.caption}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <NavBar />
    </View>
  );
}
