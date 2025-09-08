import React from 'react';
import { Platform, Pressable, Text, ActionSheetIOS, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Post = {
  id: string;
  author_id: string;
  media_urls: string[];
  caption: string | null;
  city: string | null;
  country: string | null;
};

function extractStoragePath(publicUrl: string): string | null {
  const i = publicUrl.indexOf('/media/');
  if (i === -1) return null;
  return publicUrl.substring(i + 7);
}

export default function PostMenu({ post, me, onChanged }: { post: Post; me: string | null; onChanged: () => void }) {
  const router = useRouter();

  async function doDelete() {
    if (!me || me !== post.author_id) return;
    const paths = (post.media_urls || []).map(extractStoragePath).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from('media').remove(paths);
    await supabase.from('posts').delete().eq('id', post.id).eq('author_id', me);
    onChanged();
  }

  function openMenu() {
    if (!me || me !== post.author_id) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Edit', 'Delete'], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) router.push(`/edit/${post.id}`);
          if (idx === 2) doDelete();
        }
      );
    } else {
      Alert.alert('Options', '', [
        { text: 'Edit', onPress: () => router.push(`/edit/${post.id}`) },
        { text: 'Delete', style: 'destructive', onPress: () => doDelete() },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  }

  if (!me || me !== post.author_id) return null;

  return (
    <Pressable onPress={openMenu} hitSlop={10} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontSize: 20 }}>⋯</Text>
    </Pressable>
  );
}
