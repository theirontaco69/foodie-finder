import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { supabase } from '../../lib/supabase';

type Comment = { id: string; body: string; user_id: string; created_at: string };

export default function Comments({ postId }: { postId: string }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, body, user_id, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error) setItems(data || []);
  }

  useEffect(() => { load(); }, [postId]);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, body: body.trim() });
    setBusy(false);
    if (!error) { setBody(''); load(); }
  }

  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          placeholder="Add a comment"
          value={body}
          onChangeText={setBody}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8 }}
        />
        <Button title={busy ? '...' : 'Post'} onPress={submit} disabled={busy || !body.trim()} />
      </View>
      <View style={{ gap: 6 }}>
        {items.map(c => (
          <View key={c.id} style={{ paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>{new Date(c.created_at).toLocaleString()}</Text>
            <Text>{c.body}</Text>
          </View>
        ))}
        {items.length === 0 ? <Text style={{ color: '#666' }}>No comments yet.</Text> : null}
      </View>
    </View>
  );
}
