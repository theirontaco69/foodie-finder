
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';
import { supabase } from '../../lib/supabase';

export default function LikesTotal() {
  const [meId, setMeId] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setMeId(data?.user?.id ?? null); })(); }, []);
  useEffect(() => {
    if (!meId) return;
    (async () => {
      const r = await supabase.from('posts').select('likes_count').eq('author_id', meId).limit(1000);
      const n = (r.data || []).reduce((a,x)=>a + (x.likes_count || 0), 0);
      setTotal(n);
    })();
  }, [meId]);

  return (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      <TopBar />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {total === null ? <ActivityIndicator /> : <Text style={{ fontSize: 48, fontWeight: '800' }}>{total}</Text>}
      </View>
      <NavBar />
    </View>
  );
}
