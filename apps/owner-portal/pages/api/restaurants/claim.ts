import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '../../../utils/supabase/server';

const schema = z.object({ restaurant_id: z.string().uuid() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseServer(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const insert = await supabase
    .from('restaurant_owners')
    .insert({ restaurant_id: parsed.data.restaurant_id, user_id: user.id, role: 'owner' })
    .select()
    .single();

  if (insert.error) {
    const code = (insert.error as any).code;
    const msg = String(insert.error.message || '').toLowerCase();
    if (code === '23505' || msg.includes('duplicate') || msg.includes('already')) {
      return res.status(200).json({ ok: true, alreadyOwned: true });
    }
    return res.status(400).json({ error: insert.error.message });
  }

  return res.status(200).json({ ok: true, claim: insert.data });
}
