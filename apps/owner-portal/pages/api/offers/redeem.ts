import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '../../../utils/supabase/server';
import crypto from 'crypto';

const schema = z.object({
  offer_id: z.string().uuid().optional(),
  qr: z.string().optional()
});

function startOfDayUTC(d = new Date()) { const x = new Date(d); x.setUTCHours(0,0,0,0); return x.toISOString(); }
function nextDayUTC(d = new Date()) { const x = new Date(d); x.setUTCHours(0,0,0,0); x.setUTCDate(x.getUTCDate()+1); return x.toISOString(); }

function parseSigned(qr: string | undefined, secret: string | undefined): string | null {
  if (!qr) return null;
  const m = /^offer:([0-9a-fA-F-]{36}):([a-f0-9]{64})$/.exec(qr.trim());
  if (!m) return null;
  if (!secret) return null;
  const id = m[1];
  const sig = m[2];
  const expected = crypto.createHmac('sha256', secret).update(`offer:${id}`).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseServer(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const secret = process.env.QR_SIGNING_SECRET;
  const signedId = parseSigned(parsed.data.qr, secret);
  const offerId = signedId ?? parsed.data.offer_id;
  if (!offerId) return res.status(400).json({ error: 'Missing offer' });

  const { data: o, error: offerErr } = await supabase
    .from('offers')
    .select('id, restaurant_id, title, start_at, end_at, daily_limit, status')
    .eq('id', offerId)
    .single();
  if (offerErr || !o) return res.status(404).json({ error: 'Offer not found' });

  const nowIso = new Date().toISOString();
  if (o.status === 'archived') return res.status(400).json({ error: 'Offer archived' });
  if (o.start_at && o.start_at > nowIso) return res.status(400).json({ error: 'Offer not started' });
  if (o.end_at && o.end_at < nowIso) return res.status(400).json({ error: 'Offer expired' });

  if (o.daily_limit && o.daily_limit > 0) {
    const { count, error: cntErr } = await supabase
      .from('offer_redemptions')
      .select('id', { count: 'exact' })
      .eq('offer_id', offerId)
      .gte('redeemed_at', startOfDayUTC())
      .lt('redeemed_at', nextDayUTC());
    if (cntErr) return res.status(400).json({ error: cntErr.message });
    if ((count ?? 0) >= o.daily_limit) return res.status(400).json({ error: 'Daily limit reached' });
  }

  const { data: redemption, error: insErr } = await supabase
    .from('offer_redemptions')
    .insert({ offer_id: offerId })
    .select()
    .single();
  if (insErr) return res.status(400).json({ error: insErr.message });

  return res.status(200).json({ ok: true, redemption });
}
