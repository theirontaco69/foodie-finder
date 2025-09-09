
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';
import ProfileTabs from '../components/ProfileTabs';
import { useRouter } from 'expo-router';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  verified: boolean | null;
  created_at: string | null;
};

type Post = { id: string; author_id: string; is_video: boolean; media_urls: string[]; caption: string | null; created_at: string; likes_count?: number|null };

function abbreviate(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return (Math.round(n / 100) / 10).toFixed(1).replace(/.0$/, '') + 'K';
  if (n < 1000000) return Math.round(n / 1000) + 'K';
  if (n < 10000000) return (Math.round(n / 100000) / 10).toFixed(1).replace(/.0$/, '') + 'M';
  if (n < 1000000000) return Math.round(n / 1000000) + 'M';
  return '1B+';
}

function Field({ label, value, onChangeText, multiline=false, autoCapitalize='sentences', keyboardType='default' }:{
  label:string; value:string; onChangeText:(t:string)=>void; multiline?:boolean; autoCapitalize?:any; keyboardType?:any;
}) {
  return (
    <View>
      <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} multiline={multiline} autoCapitalize={autoCapitalize} keyboardType={keyboardType}
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: multiline ? 10 : 8 }} />
    </View>
  );
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
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'Posts'|'Videos'|'Reposts'|'Reviews'|'Tags'|'Likes'>('Posts');

  useEffect(() => { (async () => {
    const a = await supabase.auth.getUser();
    let id = a?.data?.user?.id ?? null;
    if (!id) {
      const b = await supabase.auth.getSession();
      id = b?.data?.session?.user?.id ?? null;
    }
    setMeId(id);
    if (!id) setLoading(false);
  })(); }, []);

  useEffect(() => {
    if (!meId) return;
    let cancel=false;
    (async () => {
      setLoading(true);
      try {
        const r = await supabase
          .from('profiles')
          .select('id,username,display_name,bio,avatar_url,banner_url,verified:is_verified,created_at')
          .eq('id', meId)
          .maybeSingle();
        setProfile(r.data as any || null);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return ()=>{cancel=true};
  }, [meId]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setLocalAvatar(null);
    setLocalBanner(null);
  }, [profile]);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const a = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', meId);
      const b = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', meId);
      setCounts(x => ({ following: a.count || 0, followers: b.count || 0, likes: x.likes }));
    })();
  }, [meId]);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const r = await supabase.from('posts')
        .select('id,author_id,is_video,media_urls,caption,created_at,likes_count')
        .eq('author_id', meId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (r.data) {
        setPosts(r.data as any);
        const likes = (r.data as any[]).reduce((a, p) => a + (p.likes_count || 0), 0);
        setCounts(x => ({ ...x, likes }));
      }
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
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) setLocalAvatar(res.assets[0].uri);
  }
  async function pickBanner() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) setLocalBanner(res.assets[0].uri);
  }
  async function uploadPublic(uri: string, prefix: 'avatars'|'banners') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const name = `${prefix}/${meId}-${Date.now()}.jpg`;
    const up = await supabase.storage.from('media').upload(name, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up.error) throw up.error;
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
        avatar_url,
        banner_url
      };
      const u = await supabase.from('profiles').update(upd).eq('id', meId);
      if (u.error) throw u.error;
      const r = await supabase.from('profiles')
        .select('id,username,display_name,bio,avatar_url,banner_url,verified:is_verified,created_at')
        .eq('id', meId).maybeSingle();
      if (r.data) setProfile(r.data as any);
      setEditing(false);
    } catch (e:any) {
      Alert.alert('Save error', e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, paddingBottom: 96 }}>
        <TopBar />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>
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

  const isMe = meId === profile.id;

  return (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ width: '100%', aspectRatio: 3, backgroundColor: '#e9ecef' }}>
          <ExpoImage source={localBanner ? { uri: localBanner } : (profile.banner_url ? { uri: profile.banner_url } : undefined)} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ borderRadius: 40, overflow: 'hidden', width: 80, height: 80, borderWidth: 3, borderColor: '#fff', backgroundColor: '#eee' }}>
            <ExpoImage source={localAvatar ? { uri: localAvatar } : (profile.avatar_url ? { uri: profile.avatar_url } : undefined)} contentFit="cover" style={{ width: '100%', height: '100%' }} />
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
          <Text style={{ color: '#666' }}>{profile.username ? '@' + profile.username : '@user'}</Text>
          {profile.bio ? <Text style={{ marginTop: 8 }}>{profile.bio}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
            <Pressable onPress={() => router.push('/profile/following')}><Text><Text style={{ fontWeight: '700' }}>{abbreviate(counts.following)}</Text> Following</Text></Pressable>
            <Pressable onPress={() => router.push('/profile/followers')}><Text><Text style={{ fontWeight: '700' }}>{abbreviate(counts.followers)}</Text> Followers</Text></Pressable>
            <Pressable onPress={() => router.push('/profile/likes')}><Text><Text style={{ fontWeight: '700' }}>{abbreviate(counts.likes)}</Text> Likes</Text></Pressable>
          </View>
        </View>

        <View style={{ height: 6 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <ProfileTabs tabs={['Posts','Videos','Reposts','Reviews','Tags','Likes']} active={activeTab} onChange={(t)=> t==='Likes' ? router.push('/profile/likes') : setActiveTab(t as any)} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          {activeTab === 'Posts' && (
            posts.length === 0 ? <Text style={{ color: '#666' }}>No posts yet.</Text> :
            <View style={{ gap: 12 }}>
              {posts.map(p => (
                <View key={p.id} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12 }}>
                  <View style={{ gap: 8 }}>
                    {p.media_urls.map((u, i) => (
                      <ExpoImage key={i} source={{ uri: u }} style={{ width: '100%', height: 320, borderRadius: 8, backgroundColor: '#eee' }} contentFit="cover" />
                    ))}
                  </View>
                  {p.caption ? <Text style={{ marginTop: 8 }}>{p.caption}</Text> : null}
                </View>
              ))}
            </View>
          )}
          {activeTab === 'Videos' && (
            posts.filter(p=>p.is_video).length === 0 ? <Text style={{ color: '#666' }}>No videos yet.</Text> :
            <View style={{ gap: 12 }}>
              {posts.filter(p=>p.is_video).map(p => (
                <View key={p.id} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12 }}>
                  <View style={{ gap: 8 }}>
                    {p.media_urls.map((u, i) => (
                      <ExpoImage key={i} source={{ uri: u }} style={{ width: '100%', height: 320, borderRadius: 8, backgroundColor: '#eee' }} contentFit="cover" />
                    ))}
                  </View>
                  {p.caption ? <Text style={{ marginTop: 8 }}>{p.caption}</Text> : null}
                </View>
              ))}
            </View>
          )}
          {activeTab === 'Reposts' && <Text style={{ color: '#666' }}>No reposts yet.</Text>}
          {activeTab === 'Reviews' && <Text style={{ color: '#666' }}>No reviews yet.</Text>}
          {activeTab === 'Tags' && <Text style={{ color: '#666' }}>No tagged posts yet.</Text>}
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <NavBar />
    </View>
  );
}
