import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '../../../utils/supabase/server';

const schema = z.object({
  restaurant_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  kind: z.enum(['percent','fixed','bogo']),
  value: z.coerce.number().positive(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  daily_limit: z.coerce.number().int().optional(),
  per_user_limit: z.coerce.number().int().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseServer(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const body = parsed.data;

  const { data, error } = await supabase
    .from('offers')
    .insert({
      restaurant_id: body.restaurant_id,
      title: body.title,
      description: body.description ?? null,
      kind: body.kind,
      value: body.value,
      start_at: body.start_at,
      end_at: body.end_at,
      daily_limit: body.daily_limit ?? null,
      per_user_limit: body.per_user_limit ?? 1,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ ok: true, offer: data });
}
