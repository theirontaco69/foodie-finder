import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '../../utils/supabase/client';

type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type Post = { id: string; author_id: string; caption: string | null; media_urls: string[]; is_video: boolean; created_at: string };

export default function UserProfile() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const u = await supabase.auth.getUser();
      if (!u.data.user) { router.replace('/login'); return; }
      const p = await supabase
        .from('user_profiles')
        .select('id,username,display_name,avatar_url')
        .eq('id', id)
        .maybeSingle();
      setProfile((p.data as any) || null);

      const ps = await supabase
        .from('posts')
        .select('id,author_id,caption,media_urls,is_video,created_at')
        .eq('author_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts(ps.data || []);
      setLoading(false);
    })();
  }, [id]);

  const mediaSquareWrap: React.CSSProperties = { width: '100%', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden' };
  const mediaRowRight: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', marginTop: 12 };
  const mediaFill: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 500, margin: '0 auto' }}>
      <a href="/feed">← Back</a>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eee' }} />
        }
        <div>
          <h2 style={{ margin: 0 }}>{profile?.username || 'User'}</h2>
          <div style={{ color: '#666' }}>{profile?.display_name || ''}</div>
        </div>
      </header>

      <section style={{ marginTop: 16, display: 'grid', gap: 16 }}>
        {loading && <p>Loading…</p>}
        {!loading && posts.length === 0 && <p>No posts yet.</p>}

        {posts.map(p => (
          <article key={p.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={mediaRowRight}>
              {p.is_video
                ? p.media_urls.map((u, i) => (
                    <div key={i} style={mediaSquareWrap}>
                      <video controls playsInline style={mediaFill} src={u} />
                    </div>
                  ))
                : p.media_urls.map((u, i) => (
                    <div key={i} style={mediaSquareWrap}>
                      <img src={u} alt="" style={mediaFill} />
                    </div>
                  ))
              }
            </div>
            {p.caption ? <div style={{ marginTop: 8 }}>{p.caption}</div> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
