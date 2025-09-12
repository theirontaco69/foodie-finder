import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';

type Profile = { id:string; username:string|null; display_name:string|null; bio:string|null; location:string|null; website:string|null; avatar_url:string|null; banner_url:string|null; verified:boolean|null; created_at:string|null; avatar_version?:number|null };
type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };

function abbreviate(n:number){ if(n<1000) return String(n); if(n<10000) return (Math.round(n/100)/10).toFixed(1).replace(/\.0$/,'')+'K'; if(n<1_000_000) return Math.round(n/1000)+'K'; if(n<10_000_000) return (Math.round(n/100_000)/10).toFixed(1).replace(/\.0$/,'')+'M'; if(n<1_000_000_000) return Math.round(n/1_000_000)+'M'; return '1B+'; }

export default function PublicProfile(){
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [me,setMe]=useState<string|null>(null);
  const [p,setP]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true);
  const [counts,setCounts]=useState({following:0,followers:0});
  const [follows,setFollows]=useState(false);
  const [posts,setPosts]=useState<Post[]>([]);

  useEffect(()=>{(async()=>{ const a=await supabase.auth.getUser(); setMe(a?.data?.user?.id??null); })();},[]);
  useEffect(()=>{ if(!id) return; (async()=>{ setLoading(true); const r=await supabase.from('user_profiles').select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at,avatar_version').eq('id',String(id)).maybeSingle(); if(r.data) setP(r.data as any); const a=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',String(id)); const b=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('followee_id',String(id)); setCounts({following:a.count||0,followers:b.count||0}); setLoading(false); })(); },[id]);
  useEffect(()=>{ if(!me||!id) return; (async()=>{ const r=await supabase.from('follows').select('id').eq('follower_id',me).eq('followee_id',String(id)).maybeSingle(); setFollows(!!r.data); })(); },[me,id]);
  useEffect(()=>{ if(!id) return; (async()=>{ const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').eq('author_id',String(id)).order('created_at',{ascending:false}).limit(100); if(r.data) setPosts(r.data as any); })(); },[id]);

  async function toggleFollow(){
    if(!me||!id) return;
    if(follows){
      await supabase.from('follows').delete().eq('follower_id',me).eq('followee_id',String(id));
      setFollows(false);
      setCounts(c=>({ ...c, followers: Math.max(0,c.followers-1) }));
    }else{
      await supabase.from('follows').insert({ follower_id: me, followee_id: String(id) });
      setFollows(true);
      setCounts(c=>({ ...c, followers: c.followers+1 }));
    }
  }

  if(loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View>;
  if(!p) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Profile not found.</Text></View>;

  const isMe = me === p.id;

  return (
    <View style={{ flex:1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ width:'100%', aspectRatio:3, backgroundColor:'#e9ecef' }}>
          <ExpoImage source={p.banner_url ? { uri:p.banner_url } : undefined} contentFit="cover" style={{ width:'100%', height:'100%' }} />
        </View>
        <View style={{ paddingHorizontal:16, marginTop:-36, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end' }}>
          <View style={{ borderRadius:40, overflow:'hidden', width:80, height:80, borderWidth:3, borderColor:'#fff', backgroundColor:'#eee' }}>
            <ExpoImage source={p.avatar_url ? { uri:p.avatar_url } : undefined} contentFit="cover" style={{ width:'100%', height:'100%' }} />
          </View>
          {!isMe ? (
            <Pressable onPress={toggleFollow} style={{ paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:'#ddd', borderRadius:20, backgroundColor: follows ? '#111' : '#fff' }}>
              <Text style={{ fontWeight:'600', color: follows ? '#fff' : '#111' }}>{follows ? 'Following' : 'Follow'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal:16, paddingTop:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Text style={{ fontSize:20, fontWeight:'700' }}>{p.display_name||'User'}</Text>
            {p.verified ? <VerifiedBadge size={16} /> : null}
          </View>
          <Text style={{ color:'#666' }}>@{p.username||'user'}</Text>
          {p.bio ? <Text style={{ marginTop:8 }}>{p.bio}</Text> : null}

          <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
            <Text><Text style={{ fontWeight:'700' }}>{abbreviate(counts.following)}</Text> Following</Text>
            <Text><Text style={{ fontWeight:'700' }}>{abbreviate(counts.followers)}</Text> Followers</Text>
          </View>

          <View style={{ height:16 }} />
          <Text style={{ fontSize:16, fontWeight:'700', marginBottom:8 }}>Posts</Text>
          {posts.length===0 ? <Text style={{ color:'#666' }}>No posts yet.</Text> : (
            <View style={{ gap:12 }}>
              {posts.map(post=>(
                <View key={post.id} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }}>
                  <View style={{ gap:8 }}>
                    {(post.media_urls||[]).map((u,i)=>(
                      <ExpoImage key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
                    ))}
                  </View>
                  {post.caption ? <Text style={{ marginTop:8 }}>{post.caption}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
