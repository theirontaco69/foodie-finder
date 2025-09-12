import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from './lib/supabase';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import AuthorHeader from './components/AuthorHeader';

type Post={ id:string; author_id:string; is_video:boolean; media_urls:string[]; caption:string|null; created_at:string };
type Prof={ id:string; display_name:string|null; username:string|null; avatar_url:string|null; avatar_version?:number|null; verified?:boolean|null };

export default function HomeFeed(){
  const [posts,setPosts]=useState<Post[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Prof>>({});
  const [refreshing,setRefreshing]=useState(false);

  async function load(){
    const r=await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at').order('created_at',{ascending:false}).limit(50);
    const list=(r.data||[]) as Post[];
    setPosts(list);
    const ids=Array.from(new Set(list.map(x=>x.author_id))).filter(Boolean);
    if(ids.length){
      const pr=await supabase.from('user_profiles').select('id,display_name,username,avatar_url,avatar_version,verified').in('id',ids);
      const map:Record<string,Prof>={};
      for(const row of pr.data||[]){ map[row.id]=row as any; }
      setProfiles(map);
    }else{
      setProfiles({});
    }
  }

  useEffect(()=>{ load(); },[]);
  const onRefresh=async()=>{ setRefreshing(true); await load(); setRefreshing(false); };

  return(
    <View style={{ flex:1, paddingBottom:96 }}>
      <TopBar />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom:120, paddingHorizontal:12, gap:12 }}>
        {posts.length===0?<Text style={{ color:'#666', padding:16 }}>No posts yet.</Text>:
          posts.map(p=>(
            <View key={p.id} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12, gap:10 }}>
              <AuthorHeader userId={p.author_id} initial={profiles[p.author_id]||null} />
              <View style={{ gap:8 }}>
                {p.media_urls.map((u,i)=>(
                  <ExpoImage key={i} source={{ uri:u }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#eee' }} contentFit="cover" />
                ))}
              </View>
              {p.caption?<Text>{p.caption}</Text>:null}
            </View>
          ))
        }
      </ScrollView>
      <NavBar />
    </View>
  );
}
