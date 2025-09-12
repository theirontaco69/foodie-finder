
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';

type Profile = { id:string; username:string|null; display_name:string|null; bio:string|null; location:string|null; website:string|null; avatar_url:string|null; banner_url:string|null; verified:boolean|null; created_at:string|null; avatar_version?:number|null };
type Post = { id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };

function joined(d?:string|null){ if(!d) return ''; const x=new Date(d); return 'Joined ' + x.toLocaleString('en-US',{month:'long',year:'numeric'}); }

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id:string }>();
  const router = useRouter();
  const [meId,setMeId]=useState<string|null>(null);
  const [p,setP]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true);
  const [counts,setCounts]=useState({following:0,followers:0,likes:0});
  const [posts,setPosts]=useState<Post[]>([]);
  const [isFollowing,setIsFollowing]=useState(false);
  const [followsYou,setFollowsYou]=useState(false);

  useEffect(()=>{(async()=>{const s=await supabase.auth.getSession(); setMeId(s.data?.session?.user?.id??null);})();},[]);

  useEffect(()=>{ if(!id) return; (async()=>{ setLoading(true);
    const prof = await supabase.from('user_profiles').select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at,avatar_version').eq('id',String(id)).maybeSingle();
    if(prof.data) setP(prof.data as any);
    const a=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',String(id));
    const b=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('followee_id',String(id));
    const t=await supabase.rpc('total_likes_received',{author:String(id)});
    setCounts({following:a.count||0,followers:b.count||0,likes:Number(t.data??0)});
    if(meId){
      const f=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',meId).eq('followee_id',String(id));
      setIsFollowing((f.count||0)>0);
      const fy=await supabase.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',String(id)).eq('followee_id',meId);
      setFollowsYou((fy.count||0)>0);
    }
    const rp=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').eq('author_id',String(id)).order('created_at',{ascending:false}).limit(100);
    if(rp.data) setPosts(rp.data as any);
    setLoading(false);
  })(); },[id,meId]);

  async function follow(){ if(!meId){ router.push('/login'); return; } await supabase.from('follows').insert({ follower_id: meId, followee_id: String(id) }); setIsFollowing(true); setCounts(c=>({...c,followers:c.followers+1})); }
  async function unfollow(){ if(!meId) return; await supabase.from('follows').delete().eq('follower_id',meId).eq('followee_id',String(id)); setIsFollowing(false); setCounts(c=>({...c,followers:Math.max(0,c.followers-1)})); }

  if(loading){ return(<View style={{flex:1,paddingBottom:96}}><TopBar/><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View><NavBar/></View>); }
  if(!p){ return(<View style={{flex:1,paddingBottom:96}}><TopBar/><View style={{padding:16}}><Text>Profile not found.</Text></View><NavBar/></View>); }

  const isMe = meId===p.id;

  return (
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar/>
      <ScrollView contentContainerStyle={{ paddingBottom:120 }}>
        <View style={{ width:'100%', aspectRatio:3, backgroundColor:'#e9ecef' }}>
          <ExpoImage source={p.banner_url?{uri:p.banner_url}:undefined} contentFit="cover" style={{ width:'100%', height:'100%' }}/>
        </View>

        <View style={{ paddingHorizontal:16, marginTop:-36, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end' }}>
          <View style={{ borderRadius:40, overflow:'hidden', width:80, height:80, borderWidth:3, borderColor:'#fff', backgroundColor:'#eee' }}>
            <ExpoImage source={p.avatar_url?{uri:p.avatar_url}:undefined} contentFit="cover" style={{ width:'100%', height:'100%' }}/>
          </View>
          {!isMe ? (
            isFollowing
              ? <Pressable onPress={unfollow} style={{ paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:'#ddd', borderRadius:20, backgroundColor:'#fff' }}><Text style={{ fontWeight:'600' }}>Following</Text></Pressable>
              : <Pressable onPress={follow} style={{ paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:'#ddd', borderRadius:20, backgroundColor:'#fff' }}><Text style={{ fontWeight:'600' }}>Follow</Text></Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal:16, paddingTop:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Text style={{ fontSize:20, fontWeight:'700' }}>{p.display_name||'User'}</Text>
            {p.verified ? <VerifiedBadge size={16}/> : null}
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <Text style={{ color:'#666' }}>@{p.username||'user'}</Text>
            {followsYou ? <Text style={{ color:'#06f' }}>Follows you</Text> : null}
          </View>
          {p.bio ? <Text style={{ marginTop:8 }}>{p.bio}</Text> : null}

          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:14, marginTop:8, alignItems:'center' }}>
            {p.location ? (<View style={{ flexDirection:'row', alignItems:'center', gap:6 }}><Ionicons name="location-outline" size={14} color="#444"/><Text style={{ color:'#444' }}>{p.location}</Text></View>) : null}
            {p.website ? (<View style={{ flexDirection:'row', alignItems:'center', gap:6 }}><Ionicons name="link-outline" size={14} color="#444"/><Text style={{ color:'#0a7' }}>{p.website}</Text></View>) : null}
            {p.created_at ? (<View style={{ flexDirection:'row', alignItems:'center', gap:6 }}><Ionicons name="calendar-outline" size={14} color="#444"/><Text style={{ color:'#444' }}>{joined(p.created_at)}</Text></View>) : null}
          </View>

          <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
            <Text><Text style={{ fontWeight:'700' }}>{counts.following}</Text> Following</Text>
            <Text><Text style={{ fontWeight:'700' }}>{counts.followers}</Text> Followers</Text>
            <Text><Text style={{ fontWeight:'700' }}>{counts.likes}</Text> Likes</Text>
          </View>

          <View style={{ height:16 }} />
          {posts.length===0 ? (
            <Text style={{ color:'#666' }}>No posts yet.</Text>
          ) : (
            <View style={{ gap:12 }}>
              {posts.map(post=>(
                <View key={post.id} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }}>
                  <View style={{ gap:8 }}>
                    {post.media_urls.map((u,i)=>(
                      <ExpoImage key={String(i)} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover"/>
                    ))}
                  </View>
                  {post.caption ? <Text style={{ marginTop:8 }}>{post.caption}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <NavBar/>
    </View>
  );
}
