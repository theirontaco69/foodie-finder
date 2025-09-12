import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AuthorHeader from '../components/AuthorHeader';

type Post={ id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string; likes_count?:number|null };
type Profile={ id:string; username:string|null; display_name:string|null; avatar_url:string|null };
type Comment={ id:string; post_id:string; author_id:string; body:string; created_at:string; likes_count?:number|null };

export default function PostScreen(){
  const { id }=useLocalSearchParams<{id:string}>();
  const [post,setPost]=useState<Post|null>(null);
  const [loading,setLoading]=useState(true);
  const [comments,setComments]=useState<Comment[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [sort,setSort]=useState<'new'|'top'>('new');
  const [input,setInput]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [likedPost,setLikedPost]=useState(false);
  const [postLikes,setPostLikes]=useState(0);

  async function load(){
    setLoading(true);
    const pr=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at,likes_count').eq('id',String(id)).maybeSingle();
    const item=pr.data||null;
    setPost(item);
    setPostLikes(Number(item?.likes_count||0));
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(me && item){
      const has=await supabase.from('post_likes').select('id').eq('post_id',item.id).eq('user_id',me).maybeSingle();
      setLikedPost(!!has.data);
    } else setLikedPost(false);

    const cr=await supabase.from('post_comments').select('id,post_id,author_id,body,created_at,likes_count').eq('post_id',String(id)).limit(500);
    const list=Array.isArray(cr.data)?cr.data:[];
    setComments(list);
    const ids=[...(item?[item.author_id]:[]),...list.map(x=>x.author_id)];
    const uniq=[...new Set(ids)];
    if(uniq.length){
      const prf=await supabase.from('user_profiles').select('id,username,display_name,avatar_url').in('id',uniq);
      const map:Record<string,Profile>={}; (prf.data||[]).forEach((x:any)=>{ map[x.id]=x; });
      setProfiles(map);
    } else setProfiles({});
    setLoading(false);
  }

  useEffect(()=>{load();},[id]);

  const sortedComments=useMemo(()=>{
    const c=[...comments];
    if(sort==='new') return c.sort((a,b)=> new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    return c.sort((a,b)=> (Number(b.likes_count||0))-(Number(a.likes_count||0)));
  },[comments,sort]);

  async function submit(){
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(!me) return;
    const body=input.trim();
    if(!body) return;
    setSubmitting(true);
    const ins=await supabase.from('post_comments').insert({ post_id:String(id), author_id:me, body }).select().single();
    if(ins.data) setComments([ins.data as any, ...comments]);
    setInput('');
    setSubmitting(false);
  }

  async function togglePostLike(){
    if(!post) return;
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(!me) return;
    const on=likedPost;
    setLikedPost(!on);
    setPostLikes(x=>Math.max(0,x+(on?-1:1)));
    if(on){
      await supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',me);
    }else{
      await supabase.from('post_likes').insert({ post_id:post.id, user_id:me });
    }
  }

  if(loading){
    return <View style={{ flex:1 }}><ScrollView contentContainerStyle={{ padding:16 }}><ActivityIndicator/></ScrollView></View>;
  }

  if(!post){
    return <View style={{ flex:1 }}><ScrollView contentContainerStyle={{ padding:16 }}><Text>Post not found.</Text></ScrollView></View>;
  }

  return (
    <View style={{ flex:1, paddingBottom:96 }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:140 }}>
        <AuthorHeader userId={post.author_id} />
        <View style={{ height:8 }} />
        <View style={{ gap:8 }}>
          {(post.media_urls||[]).map((u,i)=>(
            <ExpoImage key={String(i)} source={{ uri: u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
          ))}
        </View>
        {post.caption ? <Text style={{ marginTop:8 }}>{post.caption}</Text> : null}

        <View style={{ marginTop:12, flexDirection:'row', alignItems:'center', gap:22 }}>
          <Pressable onPress={()=>{}}><Ionicons name="chatbubble-ellipses-outline" size={22} color="#111" /></Pressable>
          <Pressable onPress={()=>{}}><Ionicons name="repeat-outline" size={22} color="#111" /></Pressable>
          <Pressable onPress={togglePostLike} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name={likedPost?'heart':'heart-outline'} size={22} color={likedPost?'#e0245e':'#111'} />
            <Text>{postLikes}</Text>
          </Pressable>
        </View>

        <View style={{ marginTop:20, flexDirection:'row', alignItems:'center', gap:16 }}>
          <Pressable onPress={()=>setSort('new')}><Text style={{ fontWeight: sort==='new'?'700':'400' }}>Newest</Text></Pressable>
          <Pressable onPress={()=>setSort('top')}><Text style={{ fontWeight: sort==='top'?'700':'400' }}>Most Liked</Text></Pressable>
        </View>

        <View style={{ marginTop:12, gap:16 }}>
          {sortedComments.map(c=>{
            const a=profiles[c.author_id];
            const avatar=a?.avatar_url||null;
            return (
              <View key={c.id} style={{ flexDirection:'row', gap:10 }}>
                <View style={{ width:36, height:36, borderRadius:18, overflow:'hidden', backgroundColor:'#eee' }}>
                  {avatar ? <ExpoImage source={{ uri: avatar }} style={{ width:'100%', height:'100%' }} contentFit="cover" /> : null}
                </View>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <Text style={{ fontWeight:'700' }}>{a?.display_name||'User'}</Text>
                    <Text style={{ color:'#666' }}>@{a?.username||'user'}</Text>
                  </View>
                  <Text style={{ marginTop:4 }}>{c.body}</Text>
                  <View style={{ marginTop:8, flexDirection:'row', alignItems:'center', gap:18 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111" />
                    <Ionicons name="repeat-outline" size={20} color="#111" />
                    <Ionicons name="heart-outline" size={20} color="#111" />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ position:'absolute', left:0, right:0, bottom:0, padding:12, backgroundColor:'#fff', borderTopWidth:1, borderColor:'#eee' }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <TextInput value={input} onChangeText={setInput} placeholder="Add a comment" style={{ flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:20, paddingHorizontal:12, paddingVertical:8 }} />
          <Pressable disabled={submitting} onPress={submit} style={{ paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:'#ddd', borderRadius:18, backgroundColor:'#fff' }}>
            <Text style={{ fontWeight:'700', color: submitting?'#aaa':'#06f' }}>{submitting?'Posting…':'Post'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
