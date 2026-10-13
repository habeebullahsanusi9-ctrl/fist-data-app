import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const { data: plans } = await db
    .from('data_plans')
    .select('id, network, plan_name, data_amount, price, validity')
    .eq('status', 'active')
    .order('network', { ascending: true })
    .order('price', { ascending: true });

  return NextResponse.json({ plans: plans ?? [] });
}
