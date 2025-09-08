import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../../utils/supabase/server';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id = String(req.query.id || '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return res.status(400).json({ error: 'Invalid offer id' });

  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) return res.status(500).json({ error: 'Missing QR_SIGNING_SECRET' });

  const supabase = supabaseServer(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const offer = await supabase
    .from('offers')
    .select('id, restaurant_id')
    .eq('id', id)
    .single();
  if (offer.error || !offer.data) return res.status(404).json({ error: 'Offer not found' });

  const own = await supabase
    .from('restaurant_owners')
    .select('restaurant_id')
    .eq('restaurant_id', offer.data.restaurant_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (own.error || !own.data) return res.status(403).json({ error: 'Not owner' });

  const payload = `offer:${id}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const qr = `${payload}:${sig}`;
  return res.status(200).json({ ok: true, qr });
}
