import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSql } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [wallet] = await getSql() `SELECT balance FROM wallets WHERE user_id = ${user.id}`;
  const purchases = await getSql() `SELECT dp.reference, dp.network, dp.amount, dp.status, dp.phone_number, dp.created_at, p.data_amount FROM data_purchases dp JOIN data_plans p ON p.id = dp.plan_id WHERE dp.user_id = ${user.id} ORDER BY dp.created_at DESC LIMIT 10`;
  return NextResponse.json({ user, wallet: wallet ?? { balance: 0 }, purchases });
}
