import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  verified: boolean | null;
  created_at: string | null;
};

type Post = {
  id: string;
  author_id: string;
  is_video: boolean;
  media_urls: string[];
  caption: string | null;
  created_at: string;
};

function formatJoined(dateIso?: string | null) {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  return `Joined ${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
}

function abbreviate(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1_000_000) return Math.round(n / 1000) + 'K';
  if (n < 10_000_000) return (Math.round(n / 100_000) / 10).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n < 1_000_000_000) return Math.round(n / 1_000_000) + 'M';
  return '1B+';
}

export default function MyProfile() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ following: 0, followers: 0, likes: 0 });
  const [posts, setPosts] = useState<Post[]>([]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) { setLoading(false); return; }
      setMeId(auth.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at')
        .eq('id', meId)
        .single();
      if (!error && data) setProfile(data as Profile);
      setLoading(false);
    })();
  }, [meId]);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const { count } = await supabase
        .from('post_likes')
        .select('id,posts!inner(author_id)', { count: 'exact', head: true })
        .eq('posts.author_id', meId);
      setCounts(prev => ({ ...prev, likes: count || 0 }));
    })();
  }, [meId]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setLocation(profile.location || '');
    setWebsite(profile.website || '');
    setLocalAvatar(null);
    setLocalBanner(null);
  }, [profile]);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const { count: following } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', meId);
      const { count: followers } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', meId);
      setCounts({ following: following || 0, followers: followers || 0, likes: 0 });
    })();
  }, [meId]);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id,author_id,is_video,media_urls,caption,created_at')
        .eq('author_id', meId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) setPosts(data as Post[]);
    })();
  }, [meId]);

  const mediaTypesImages = useMemo(() => {
    const anyPicker: any = ImagePicker;
    if (anyPicker?.MediaType?.Image) return [anyPicker.MediaType.Image];
    if (anyPicker?.MediaTypeOptions?.Images) return anyPicker.MediaTypeOptions.Images;
    return undefined;
  }, []);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: mediaTypesImages, allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) setLocalAvatar(res.assets[0].uri);
  }

  async function pickBanner() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: mediaTypesImages, allowsEditing: true, aspect: [3, 1], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) setLocalBanner(res.assets[0].uri);
  }

  async function uploadPublic(uri: string, prefix: 'avatars' | 'banners') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const name = `${prefix}/${meId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('media').upload(name, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    const { data } = supabase.storage.from('media').getPublicUrl(name);
    return data.publicUrl;
  }

  async function save() {
    if (!meId) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url || null;
      let banner_url = profile?.banner_url || null;
      if (localAvatar) avatar_url = await uploadPublic(localAvatar, 'avatars');
      if (localBanner) banner_url = await uploadPublic(localBanner, 'banners');

      const upd: Partial<Profile> = {
        display_name: name || null,
        username: username || null,
        bio: bio || null,
        location: location || null,
        website: website || null,
        avatar_url,
        banner_url
      };
      const { error } = await supabase.from('user_profiles').update(upd).eq('id', meId);
      if (error) throw error;
      const { data } = await supabase
        .from('user_profiles')
        .select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at')
        .eq('id', meId)
        .single();
      if (data) setProfile(data as Profile);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Save error', e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, paddingBottom: 96 }}>
        <TopBar />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
        <NavBar />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, paddingBottom: 96 }}>
        <TopBar />
        <View style={{ padding: 16 }}><Text>Profile not found.</Text></View>
        <NavBar />
      </View>
    );
  }

  const isMe = profile && meId === profile.id;

  return (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      <TopBar />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ width: '100%', aspectRatio: 3, backgroundColor: '#e9ecef' }}>
          <ExpoImage
            source={localBanner ? { uri: localBanner } : (profile.banner_url ? { uri: profile.banner_url } : undefined)}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ borderRadius: 40, overflow: 'hidden', width: 80, height: 80, borderWidth: 3, borderColor: '#fff', backgroundColor: '#eee' }}>
            <ExpoImage
              source={localAvatar ? { uri: localAvatar } : (profile.avatar_url ? { uri: profile.avatar_url } : undefined)}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </View>

          {isMe ? (
            <Pressable onPress={() => setEditing(true)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#fff' }}>
              <Text style={{ fontWeight: '600' }}>Edit profile</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{profile.display_name || 'User'}</Text>
            {profile.verified ? <VerifiedBadge size={16} /> : null}
          </View>
          <Text style={{ color: '#666' }}>@{profile.username || 'user'}</Text>
          {profile.bio ? <Text style={{ marginTop: 8 }}>{profile.bio}</Text> : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8, alignItems: 'center' }}>
            {profile.location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location-outline" size={14} color="#444" />
                <Text style={{ color: '#444' }}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.website ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="link-outline" size={14} color="#444" />
                <Text style={{ color: '#0a7' }}>{profile.website}</Text>
              </View>
            ) : null}
            {profile.created_at ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={14} color="#444" />
                <Text style={{ color: '#444' }}>{formatJoined(profile.created_at)}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <Pressable onPress={() => router.push('/profile/following')}>
            <Text><Text style={{ fontWeight: '700' }}>{abbreviate(counts.following)}</Text> Following</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/profile/followers')}>
            <Text><Text style={{ fontWeight: '700' }}>{abbreviate(counts.followers)}</Text> Followers</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/profile/likes')}>
            <Text><Text style={{ fontWeight: '700' }}>{abbreviate(counts.likes)}</Text> Likes</Text>
          </Pressable>
          </View>

          <View style={{ height: 16 }} />

          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Posts</Text>
          {posts.length === 0 ? (
            <Text style={{ color: '#666' }}>No posts yet.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {posts.map((p) => (
                <View key={p.id} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12 }}>
                  <View style={{ gap: 8 }}>
                    {p.is_video
                      ? p.media_urls.map((u, i) => (
                          <ExpoImage
                            key={i}
                            source={{ uri: u }}
                            style={{ width: '100%', height: 320, borderRadius: 8, backgroundColor: '#eee' }}
                            contentFit="cover"
                          />
                        ))
                      : p.media_urls.map((u, i) => (
                          <ExpoImage
                            key={i}
                            source={{ uri: u }}
                            style={{ width: '100%', height: 320, borderRadius: 8, backgroundColor: '#eee' }}
                            contentFit="cover"
                          />
                        ))
                    }
                  </View>
                  {p.caption ? <Text style={{ marginTop: 8 }}>{p.caption}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(false)} transparent={false}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' }}>
            <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
              <Pressable onPress={() => setEditing(false)}><Text style={{ color: '#06f', fontWeight: '600' }}>Cancel</Text></Pressable>
              <Text style={{ fontSize: 17, fontWeight: '700' }}>Edit profile</Text>
              <Pressable disabled={saving} onPress={save}>
                <Text style={{ color: saving ? '#aaa' : '#06f', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Pressable onPress={pickBanner} style={{ width: '100%', aspectRatio: 3, backgroundColor: '#e9ecef', alignItems: 'center', justifyContent: 'center' }}>
              <ExpoImage source={localBanner ? { uri: localBanner } : (profile?.banner_url ? { uri: profile.banner_url } : undefined)} contentFit="cover" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              <Text style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>Change banner</Text>
            </Pressable>

            <View style={{ paddingHorizontal: 16, marginTop: -36, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              <Pressable onPress={pickAvatar} style={{ borderRadius: 40, overflow: 'hidden', width: 80, height: 80, borderWidth: 3, borderColor: '#fff', backgroundColor: '#eee' }}>
                <ExpoImage source={localAvatar ? { uri: localAvatar } : (profile?.avatar_url ? { uri: profile.avatar_url } : undefined)} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              </Pressable>
              <Text style={{ color: '#666' }}>Tap image to change</Text>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              <Field label="Name" value={name} onChangeText={setName} />
              <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
              <Field label="Bio" value={bio} onChangeText={setBio} multiline />
              <Field label="Location" value={location} onChangeText={setLocation} />
              <Field label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <NavBar />
    </View>
  );
}

function Field(props: any) {
  return (
    <View>
      <Text style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{props.label}</Text>
      <TextInput
        {...props}
        style={[
          { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff' },
          props.multiline ? { height: 100, textAlignVertical: 'top' } : null
        ]}
      />
    </View>
  );
}
