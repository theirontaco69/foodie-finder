import { createServerClient } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export function supabaseServer(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies[name];
        },
        set(name, value, options) {
          const cookie = serialize(name, value, { ...options, httpOnly: true, sameSite: 'lax', path: '/' });
          const prev = res.getHeader('Set-Cookie');
          res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev as string[], cookie] : [cookie]);
        },
        remove(name, options) {
          const cookie = serialize(name, '', { ...options, expires: new Date(0), path: '/' });
          const prev = res.getHeader('Set-Cookie');
          res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev as string[], cookie] : [cookie]);
        }
      }
    }
  );
}
