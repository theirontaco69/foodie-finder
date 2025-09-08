import React, { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '../utils/supabase/client';

type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

export default function ProfilePage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setMe(user.id);
      const { data } = await supabase.from('user_profiles').select('id, username, display_name, avatar_url').eq('id', user.id).maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setUsername(data.username || '');
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
        const guess = (user.email || '').split('@')[0] || '';
        setUsername(guess);
      }
    })();
  }, []);

  async function uploadAvatar(file: File) {
    if (!me || !file) return;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${me}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from('avatars').upload(path, file, { upsert: false });
    if (up.error) { setMsg(up.error.message); return; }
    const pub = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(pub.data.publicUrl);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabase.from('user_profiles').upsert({
      id: me,
      username: username || null,
      display_name: displayName || null,
      avatar_url: avatarUrl || null
    }, { onConflict: 'id' });
    setBusy(false);
    if (error) {
      if ((error as any).code === '23505') setMsg('Username taken. Choose another.');
      else setMsg(error.message);
      return;
    }
    setMsg('Saved.');
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720 }}>
      <h1>Edit Profile</h1>
      <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eee' }} />
          }
          <input type="file" accept="image/*" onChange={e => e.target.files && uploadAvatar(e.target.files[0])} />
        </div>
        <label>
          <div>Username</div>
          <input value={username} onChange={e => setUsername(e.target.value)} />
        </label>
        <label>
          <div>Display name</div>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {msg && <div>{msg}</div>}
      </form>
    </main>
  );
}
