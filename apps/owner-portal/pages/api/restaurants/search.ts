import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseServer(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(200).json({ ok: true, results: [] });

  const owned = await supabase.from('restaurant_owners').select('restaurant_id').eq('user_id', user.id);
  if (owned.error) return res.status(400).json({ error: owned.error.message });
  const ownedIds = new Set((owned.data ?? []).map(r => r.restaurant_id));

  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name')
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(20);

  if (error) return res.status(400).json({ error: error.message });
  const results = (data ?? []).map(r => ({ ...r, owned: ownedIds.has(r.id) }));
  return res.status(200).json({ ok: true, results });
}
