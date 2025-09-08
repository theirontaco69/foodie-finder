import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseServer(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const owned = await supabase
    .from('restaurant_owners')
    .select('restaurant_id')
    .eq('user_id', user.id);

  if (owned.error) return res.status(400).json({ error: owned.error.message });

  const ids = (owned.data ?? []).map(r => r.restaurant_id);
  if (!ids.length) return res.status(200).json({ ok: true, offers: [] });

  const { data, error } = await supabase
    .from('offers')
    .select('id,title,restaurant_id,kind,value,start_at,end_at,status')
    .in('restaurant_id', ids)
    .order('start_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(50);

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ ok: true, offers: data });
}
