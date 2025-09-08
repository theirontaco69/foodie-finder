import React, { useState } from 'react';
import { supabaseBrowser } from '../utils/supabase/client';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setSending(true);
    // store email locally so the callback flow can use it if needed
    localStorage.setItem('magic_email', email);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'http://localhost:3000/auth/callback', shouldCreateUser: true }
    });
    setSending(false);
    setMsg(error ? 'Error sending email' : 'Email sent. Copy the 6-digit code from the email or click the link.');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email' // 6-digit code from the email body
    });
    setVerifying(false);
    if (error) {
      setMsg('Invalid or expired code. Send a new email and try again.');
    } else {
      router.replace('/offers-list');
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420 }}>
      <h1>Owner Login</h1>

      <form onSubmit={sendLink} style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <input type="email" placeholder="you@restaurant.com" value={email} onChange={e => setEmail(e.target.value)} />
        <button type="submit" disabled={!email || sending}>{sending ? 'Sending…' : 'Send Email'}</button>
      </form>

      <form onSubmit={verifyCode} style={{ display: 'grid', gap: 12 }}>
        <input inputMode="numeric" pattern="[0-9]*" placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value)} />
        <button type="submit" disabled={!email || code.length < 6 || verifying}>{verifying ? 'Verifying…' : 'Verify Code'}</button>
      </form>

      {msg && <p>{msg}</p>}
    </main>
  );
}
