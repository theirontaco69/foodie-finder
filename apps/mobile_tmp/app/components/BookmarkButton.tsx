import React, { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function BookmarkButton({ postId }: { postId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setUserId(uid);
    if (!uid) { setSaved(false); return; }
    const mine = await supabase.from('post_bookmarks').select('post_id').eq('post_id', postId).eq('user_id', uid).maybeSingle();
    setSaved(!!mine.data);
  }

  useEffect(() => { refresh(); }, [postId]);

  async function toggle() {
    if (!userId || busy) return;
    setBusy(true);
    if (saved) await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
    else await supabase.from('post_bookmarks').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
    setBusy(false);
    refresh();
  }

  return (
    <Pressable onPress={toggle} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 999 }}>
      <Text style={{ fontSize: 18 }}>🔖</Text>
    </Pressable>
  );
}
