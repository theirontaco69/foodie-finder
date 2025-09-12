import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AuthorHeader from '../components/AuthorHeader';

type Post={ id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };
type Profile={ id:string; username:string|null; display_name:string|null; avatar_url:string|null };
type Comment={ id:string; post_id:string; author_id:string; body:string; created_at:string };

export default function PostScreen(){
  const { id }=useLocalSearchParams<{id:string}>();
  const [post,setPost]=useState<Post|null>(null);
  const [loading,setLoading]=useState(true);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [comments,setComments]=useState<Comment[]>([]);
  const [sort,setSort]=useState<'new'|'top'>('new');
  const [input,setInput]=useState('');
  const [submitting,setSubmitting]=useState(false);

  async function load(){
    setLoading(true);
    const pr=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').eq('id',String(id)).maybeSingle();
    setPost(pr.data||null);
    const cr=await supabase.from('post_comments').select('id,post_id,author_id,body,created_at').eq('post_id',String(id)).order('created_at',{ascending:false}).limit(500);
    const list=Array.isArray(cr.data)?cr.data:[];
    setComments(list);
    const ids=[...new Set([...(pr.data?[pr.data.author_id]:[]),...list.map(x=>x.author_id)])];
    if(ids.length){
      const prf=await supabase.from('user_profiles').select('id,username,display_name,avatar_url').in('id',ids);
      const map:Record<string,Profile>={}; (prf.data||[]).forEach((x:any)=>{ map[x.id]=x; });
      setProfiles(map);
    } else setProfiles({});
    setLoading(false);
  }

  useEffect(()=>{load();},[id]);

  const sortedComments=useMemo(()=>{
    const c=[...comments];
    if(sort==='new') return c.sort((a,b)=> new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    return c;
  },[comments,sort]);

  async function submit(){
    const me=(await supabase.auth.getUser())?.data?.user?.id||null;
    if(!me) return;
    if(!input.trim()) return;
    setSubmitting(true);
    const ins=await supabase.from('post_comments').insert({ post_id:String(id), author_id:me, body:input.trim() }).select().single();
    if(ins.data){
      setComments([ins.data as any, ...comments]);
      setInput('');
    }
    setSubmitting(false);
  }

  if(loading){
    return (
      <View style={{ flex:1 }}>
        <ScrollView contentContainerStyle={{ padding:16 }}>
          <ActivityIndicator />
        </ScrollView>
      </View>
    );
  }

  if(!post){
    return (
      <View style={{ flex:1 }}>
        <ScrollView contentContainerStyle={{ padding:16 }}>
          <Text>Post not found.</Text>
        </ScrollView>
      </View>
    );
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

        <View style={{ marginTop:20, flexDirection:'row', alignItems:'center', gap:16 }}>
          <Pressable onPress={()=>{}}><Text style={{ fontWeight: sort==='new'?'700':'400' }}>Newest</Text></Pressable>
          <Pressable onPress={()=>setSort('top')}><Text style={{ fontWeight: sort==='top'?'700':'400' }}>Most Liked</Text></Pressable>
        </View>

        <View style={{ marginTop:12, gap:12 }}>
          {sortedComments.map(c=>{
            const a=profiles[c.author_id];
            const avatar=a ? (a.avatar_url||null) : null;
            return (
              <View key={c.id} style={{ flexDirection:'row', gap:10 }}>
                <Pressable onPress={()=>{}} style={{ width:36, height:36, borderRadius:18, overflow:'hidden', backgroundColor:'#eee' }}>
                  {avatar ? <ExpoImage source={{ uri: avatar }} style={{ width:'100%', height:'100%' }} contentFit="cover" /> : null}
                </Pressable>
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
