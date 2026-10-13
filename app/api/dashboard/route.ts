import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: wallet } = await db
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: purchases } = await db
    .from('data_purchases')
    .select('reference, network, amount, status, phone_number, created_at, data_plans(data_amount)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ user, wallet: wallet ?? { balance: 0 }, purchases: purchases ?? [] });
}
