import React, { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LikeButton({ postId }: { postId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const cnt = await supabase
      .from('post_likes')
      .select('post_id', { count: 'exact' })
      .eq('post_id', postId);
    setCount(cnt.count ?? 0);

    if (user?.id) {
      const mine = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      setLiked(!!mine.data);
    }
  }

  useEffect(() => { refresh(); }, [postId]);

  async function toggle() {
    if (!userId || busy) return;
    setBusy(true);
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await supabase.from('post_likes').upsert(
        { post_id: postId, user_id: userId },
        { onConflict: 'post_id,user_id' }
      );
    }
    setBusy(false);
    await refresh();
  }

  return (
    <Pressable onPress={toggle} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>
      <Text>{liked ? '♥' : '♡'} {count}</Text>
    </Pressable>
  );
}
