import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { getSql } from '@/lib/db';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
  const body = await request.json();
  const planId = String(body.planId ?? '');
  const phoneNumber = String(body.phoneNumber ?? '').trim();
  if (!planId || !phoneNumber) return NextResponse.json({ error: 'Select a plan and enter the phone number.' }, { status: 400 });

  const reference = `FD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  try {
    const [plan] = await getSql() `SELECT id, network, plan_name, data_amount, price FROM data_plans WHERE id = ${planId} AND status = 'active' LIMIT 1`;
    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

    const [charged] = await getSql() `
      UPDATE wallets
      SET balance = balance - ${plan.price}, updated_at = NOW()
      WHERE user_id = ${user.id} AND balance >= ${plan.price}
      RETURNING balance
    `;
    if (!charged) return NextResponse.json({ error: 'Insufficient wallet balance. Fund your wallet first.' }, { status: 400 });

    await getSql() `INSERT INTO data_purchases (user_id, plan_id, phone_number, network, amount, status, reference) VALUES (${user.id}, ${plan.id}, ${phoneNumber}, ${plan.network}, ${plan.price}, 'pending', ${reference})`;
    await getSql() `INSERT INTO transactions (user_id, transaction_type, amount, status, reference, description) VALUES (${user.id}, 'data_purchase', ${plan.price}, 'pending', ${reference}, ${'Data purchase: ' + plan.network + ' ' + plan.data_amount + ' to ' + phoneNumber})`;
    return NextResponse.json({ ok: true, reference, status: 'pending', message: 'Purchase recorded. Telecom fulfilment is not connected yet.' });
  } catch {
    return NextResponse.json({ error: 'Purchase could not be completed.' }, { status: 500 });
  }
}
