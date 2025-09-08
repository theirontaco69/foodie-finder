import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../utils/supabase/client';
import { useRouter } from 'next/router';

export default function Callback() {
  const [msg, setMsg] = useState('Signing you in…');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const token_hash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type'); // magiclink|recovery|signup|email_change

      let err: any = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        err = error;
      } else if (token_hash && type) {
        const email = localStorage.getItem('magic_email') || '';
        const { error } = await supabase.auth.verifyOtp({
          email,
          token_hash,
          type: type as any
        });
        err = error;
      } else {
        err = new Error('Missing auth params');
      }

      if (err) {
        setMsg('Sign-in failed. Send a new link and try again.');
      } else {
        router.replace('/offers-list');
      }
    })();
  }, [router]);

  return <main style={{ padding: 24, fontFamily: 'system-ui' }}><h1>{msg}</h1></main>;
}
