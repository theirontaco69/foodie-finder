import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '../utils/supabase/client';

type Post = {
  id: string;
  author_id: string;
  caption: string | null;
  media_urls: string[];
  is_video: boolean;
  city: string | null;
  country: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function useProfiles(authorIds: string[]) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [map, setMap] = useState<Record<string, Profile>>({});
  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(authorIds)).filter(Boolean);
      if (ids.length === 0) { setMap({}); return; }
      const { data } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids);
      const m: Record<string, Profile> = {};
      (data || []).forEach(p => { m[p.id] = p as Profile; });
      setMap(m);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorIds.join(',')]);
  return map;
}

function LikeButton({ postId }: { postId: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);
    const c = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    setCount(c.count ?? 0);
    if (uid) {
      const mine = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', uid)
        .maybeSingle();
      setLiked(!!mine.data);
    } else {
      setLiked(false);
    }
  }

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`likes-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function toggle() {
    if (!userId || busy) return;
    setBusy(true);
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await supabase.from('post_likes').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
    }
    setBusy(false);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={toggle}
        disabled={!userId || busy}
        style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 999, minWidth: 80, fontSize: 18 }}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        {liked ? '♥' : '♡'}
      </button>
      <span style={{ fontSize: 14, color: '#666' }}>{count}</span>
    </div>
  );
}

function BookmarkButton({ postId }: { postId: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setSaved(false); return; }
    const mine = await supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', uid)
      .maybeSingle();
    setSaved(!!mine.data);
  }

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`bm-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_bookmarks', filter: `post_id=eq.${postId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function toggle() {
    if (!userId || busy) return;
    setBusy(true);
    if (saved) {
      await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await supabase.from('post_bookmarks').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Unsave' : 'Save'}
      disabled={!userId || busy}
      style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 999, fontSize: 18 }}
    >
      🔖
    </button>
  );
}

function Comments({ postId }: { postId: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<Array<{ id: string; body: string; created_at: string }>>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('post_comments')
      .select('id, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(10);
    setItems(data || []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, body: text });
    setBusy(false);
    if (!error) setBody('');
  }

  return (
    <div style={{ marginTop: 8 }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Add a comment" value={body} onChange={e => setBody(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" disabled={busy || !body.trim()}>Post</button>
      </form>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {items.map(c => (
          <div key={c.id}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(c.created_at).toLocaleString()}</div>
            <div>{c.body}</div>
          </div>
        ))}
        {items.length === 0 && <div style={{ color: '#666' }}>No comments yet.</div>}
      </div>
    </div>
  );
}

function PostMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="More options"
        style={{ background: 'transparent', border: 'none', fontSize: 20, lineHeight: 1, padding: '4px 8px', cursor: 'pointer' }}
      >⋯</button>
      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid #ddd',
            borderRadius: 10, boxShadow: '0 4px 18px rgba(0,0,0,0.08)', minWidth: 140, zIndex: 10
          }}
        >
          <button onClick={() => { setOpen(false); onEdit(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}>Edit</button>
          <button onClick={() => { setOpen(false); onDelete(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#b00020', cursor: 'pointer' }}>Delete</button>
        </div>
      )}
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
    >
      <img
        src={url}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
      />
    </div>
  );
}

export default function FeedPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [me, setMe] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [city, setCity] = useState('Los Angeles');
  const [country, setCountry] = useState('US');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [msg, setMsg] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    load();
    const ch = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id, author_id, caption, media_urls, is_video, city, country, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) setMsg(error.message);
    else setPosts(data || []);
  }

  function extractStoragePath(publicUrl: string): string | null {
    const i = publicUrl.indexOf('/media/');
    if (i === -1) return null;
    return publicUrl.substring(i + 7);
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsg('Not signed in'); return; }
    const uploads: string[] = [];
    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split('.').pop() || 'bin';
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const up = await supabase.storage.from('media').upload(path, f, { upsert: false });
        if (up.error) { setMsg(up.error.message); return; }
        const pub = supabase.storage.from('media').getPublicUrl(path);
        uploads.push(pub.data.publicUrl);
      }
    }
    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      caption: caption || null,
      media_urls: uploads,
      is_video: isVideo,
      city: city || null,
      country: country || null
    });
    if (error) setMsg(error.message);
    else {
      setCaption('');
      setFiles(null);
      const el = document.getElementById('files') as HTMLInputElement | null;
      if (el) el.value = '';
    }
  }

  function startEdit(p: Post) {
    setEditId(p.id);
    setEditCaption(p.caption || '');
    setEditCity(p.city || '');
    setEditCountry(p.country || '');
  }

  function cancelEdit() {
    setEditId(null);
    setEditCaption('');
    setEditCity('');
    setEditCountry('');
  }

  async function saveEdit() {
    if (!editId || !me) return;
    const { error } = await supabase
      .from('posts')
      .update({ caption: editCaption || null, city: editCity || null, country: editCountry || null })
      .eq('id', editId)
      .eq('author_id', me);
    if (error) setMsg(error.message);
    cancelEdit();
  }

  async function deletePost(p: Post) {
    if (!me) return;
    const paths = (p.media_urls || []).map(extractStoragePath).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from('media').remove(paths);
    const { error } = await supabase.from('posts').delete().eq('id', p.id).eq('author_id', me);
    if (error) setMsg(error.message);
  }

  const profileMap = useProfiles(posts.map(p => p.author_id));

  const mediaSquareWrap: React.CSSProperties = {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'block'
  };
  const mediaBoxRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 12
  };
  const imgInSquare: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    cursor: 'zoom-in'
  };
  const videoInSquare: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center'
  };

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Local Feed</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/profile" style={{ textDecoration: 'none' }}>Profile</a>
          <a href="/offers-list" style={{ textDecoration: 'none' }}>Owner Tools</a>
        </div>
      </div>

      <form onSubmit={createPost} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        <textarea placeholder="Caption" value={caption} onChange={e => setCaption(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="files" type="file" multiple accept={isVideo ? 'video/*' : 'image/*'} onChange={e => setFiles(e.target.files)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={isVideo} onChange={e => setIsVideo(e.target.checked)} />
            Upload video
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
          <input placeholder="Country (ISO-2)" value={country} onChange={e => setCountry(e.target.value)} />
        </div>
        <button type="submit">Post</button>
      </form>

      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}

      <section style={{ marginTop: 24, display: 'grid', gap: 16 }}>
        {loading ? <p>Loading…</p> : posts.map(p => {
          const prof = profileMap[p.author_id];
          const name = prof?.username || prof?.display_name || 'User';
          const avatar = prof?.avatar_url || '';
          return (
            <article key={p.id} style={{ position: 'relative', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a href={`/user/${p.author_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                  {avatar ? (
                    <img src={avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee' }} />
                  )}
                  <div style={{ display: 'grid', lineHeight: 1.2 }}>
                    <strong style={{ fontSize: 14 }}>{name}</strong>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      {p.city || 'Unknown'} {p.country ? '• ' + p.country : ''} • {new Date(p.created_at).toLocaleString()}
                    </span>
                  </div>
                </a>
                {me === p.author_id && (<PostMenu onEdit={() => startEdit(p)} onDelete={() => deletePost(p)} />)}
              </div>

              {editId === p.id ? (
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <textarea placeholder="Caption" value={editCaption} onChange={e => setEditCaption(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input placeholder="City" value={editCity} onChange={e => setEditCity(e.target.value)} />
                    <input placeholder="Country" value={editCountry} onChange={e => setEditCountry(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={saveEdit}>Save</button>
                    <button type="button" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={mediaBoxRow}>
                    {p.is_video
                      ? p.media_urls.map((u, i) => (
                          <div key={i} style={mediaSquareWrap}>
                            <video controls playsInline style={videoInSquare} src={u} />
                          </div>
                        ))
                      : p.media_urls.map((u, i) => (
                          <div key={i} style={mediaSquareWrap} onClick={() => setLightboxUrl(u)}>
                            <img src={u} alt="" style={imgInSquare} />
                          </div>
                        ))
                    }
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <LikeButton postId={p.id} />
                    <BookmarkButton postId={p.id} />
                  </div>
                  <div style={{ marginTop: 8 }}>{p.caption}</div>
                  <Comments postId={p.id} />
                </>
              )}
            </article>
          );
        })}
        {!loading && posts.length === 0 && <p>No posts yet.</p>}
      </section>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </main>
  );
}
