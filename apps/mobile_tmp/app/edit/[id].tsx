import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function EditPost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(user?.id ?? null);
      const { data, error } = await supabase
        .from('posts')
        .select('author_id, caption, city, country')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) { Alert.alert('Not found'); router.back(); return; }
      if (!user || data.author_id !== user.id) { Alert.alert('Not allowed'); router.back(); return; }
      setCaption(data.caption || '');
      setCity(data.city || '');
      setCountry(data.country || '');
      setLoading(false);
    })();
  }, [id]);

  async function save() {
    if (!me) return;
    const { error } = await supabase
      .from('posts')
      .update({ caption: caption || null, city: city || null, country: country || null })
      .eq('id', String(id))
      .eq('author_id', me);
    if (error) Alert.alert('Save error', error.message);
    else router.back();
  }

  if (loading) return <View style={{ flex: 1, padding: 16 }}><Text>Loading…</Text></View>;

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Edit Post</Text>
      <TextInput placeholder="Caption" value={caption} onChangeText={setCaption} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput placeholder="City" value={city} onChangeText={setCity} style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }} />
        <TextInput placeholder="Country" value={country} onChangeText={setCountry} style={{ width: 120, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }} />
      </View>
      <Button title="Save" onPress={save} />
    </View>
  );
}
