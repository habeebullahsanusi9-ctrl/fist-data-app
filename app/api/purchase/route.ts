import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

  const body = await request.json();
  const planId = String(body.planId ?? '');
  const phoneNumber = String(body.phoneNumber ?? '').trim();
  if (!planId || !phoneNumber)
    return NextResponse.json({ error: 'Select a plan and enter the phone number.' }, { status: 400 });

  const reference = `FD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  try {
    const { data: plan } = await db
      .from('data_plans')
      .select('id, network, plan_name, data_amount, price')
      .eq('id', planId)
      .eq('status', 'active')
      .maybeSingle();

    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

    // Atomic balance check + deduction via SECURITY DEFINER function
    const { data: newBalance, error: dedError } = await db.rpc('deduct_wallet_balance', {
      p_user_id: user.id,
      p_amount: plan.price,
    });

    if (dedError || newBalance === null) {
      return NextResponse.json({ error: 'Insufficient wallet balance. Fund your wallet first.' }, { status: 400 });
    }

    await db.from('data_purchases').insert({
      user_id: user.id,
      plan_id: plan.id,
      phone_number: phoneNumber,
      network: plan.network,
      amount: plan.price,
      status: 'pending',
      reference,
    });

    await db.from('transactions').insert({
      user_id: user.id,
      transaction_type: 'data_purchase',
      amount: plan.price,
      status: 'pending',
      reference,
      description: `Data purchase: ${plan.network} ${plan.data_amount} to ${phoneNumber}`,
    });

    return NextResponse.json({
      ok: true,
      reference,
      status: 'pending',
      balance: newBalance,
      message: 'Purchase recorded. Telecom fulfilment is not connected yet.',
    });
  } catch {
    return NextResponse.json({ error: 'Purchase could not be completed.' }, { status: 500 });
  }
}
