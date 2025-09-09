
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../components/VerifiedBadge';
import TopBar from '../components/TopBar';
import NavBar from '../components/NavBar';
import ProfileTabs from '../components/ProfileTabs';

type Profile = { id: string; username: string|null; display_name: string|null; avatar_url: string|null; banner_url: string|null; bio: string|null; location: string|null; website: string|null; verified: boolean|null; created_at: string|null; avatar_version?: number|null };
type Post = { id: string; author_id: string; is_video: boolean; media_urls: string[]; caption: string|null; created_at: string };

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState({ following: 0, followers: 0, likes: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Posts'|'Videos'|'Reposts'|'Reviews'|'Tags'>('Posts');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const r = await supabase.from('profiles')
  .select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified:is_verified,created_at,avatar_version')
  .eq('id', meId).maybeSingle();
if (r.data) {
  setProfile(r.data as any);
} else {
  const r2 = await supabase.from('user_profiles')
    .select('id,username,display_name,bio,location,website,avatar_url,banner_url,verified,created_at,avatar_version')
    .eq('id', meId).maybeSingle();
  if (r2.data) setProfile({ ...(r2.data as any), verified: (r2.data as any).verified ?? null } as any);
}
      if (r.data) setProfile(r.data as Profile);
      const a = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', id);
      const b = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', id);
      const p = await supabase.from('posts').select('id,author_id,is_video,media_urls,caption,created_at,likes_count').eq('author_id', id).order('created_at',{ascending:false}).limit(100);
      if (p.data) {
        setPosts(p.data as Post[]);
        const likes = (p.data as any[]).reduce((acc,x)=>acc+(x.likes_count||0),0);
        setCounts({ following: a.count||0, followers: b.count||0, likes });
      } else {
        setCounts({ following: a.count||0, followers: b.count||0, likes: 0 });
      }
      setLoading(false);
    })();
  }, [id]);

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

  return (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ width: '100%', aspectRatio: 3, backgroundColor: '#e9ecef' }}>
          <ExpoImage source={profile.banner_url ? { uri: profile.banner_url } : undefined} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ borderRadius: 40, overflow: 'hidden', width: 80, height: 80, borderWidth: 3, borderColor: '#fff', backgroundColor: '#eee' }}>
            <ExpoImage source={profile.avatar_url ? { uri: profile.avatar_url } : undefined} contentFit="cover" style={{ width: '100%', height: '100%' }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{profile.display_name || 'User'}</Text>
            {profile.verified ? <VerifiedBadge size={16} /> : null}
          </View>
          <Text style={{ color: '#666' }}>{profile.username ? '@' + profile.username : '@user'}</Text>
          {profile.bio ? <Text style={{ marginTop: 8 }}>{profile.bio}</Text> : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            {profile.location ? <Text style={{ color: '#444' }}>{profile.location}</Text> : null}
            {profile.website ? <Text style={{ color: '#06f' }}>{profile.website}</Text> : null}
            {profile.created_at ? <Text style={{ color: '#444' }}>{new Date(profile.created_at).toLocaleString('en-US',{month:'long',year:'numeric'})}</Text> : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
            <Text><Text style={{ fontWeight: '700' }}>{counts.following}</Text> Following</Text>
            <Text><Text style={{ fontWeight: '700' }}>{counts.followers}</Text> Followers</Text>
            <Text><Text style={{ fontWeight: '700' }}>{counts.likes}</Text> Likes</Text>
          </View>
        </View>

        <View style={{ height: 6 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <ProfileTabs
            tabs={['Posts','Videos','Reposts','Reviews','Tags']}
            active={activeTab}
            onChange={(t)=> setActiveTab(t as any)}
          />
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
      <NavBar />
    </View>
  );
}
