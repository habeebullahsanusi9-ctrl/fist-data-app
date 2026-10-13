import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

  const body = await request.json();
  const amount = Number(body.amount);
  if (!amount || amount < 100) {
    return NextResponse.json({ error: 'Minimum funding amount is ₦100.' }, { status: 400 });
  }

  const reference = `FD-FUND-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Record a pending transaction
  const { error: txError } = await db.from('transactions').insert({
    user_id: user.id,
    transaction_type: 'wallet_funding',
    amount,
    status: 'pending',
    reference,
    description: `Wallet funding of ₦${amount.toLocaleString()}`,
  });

  if (txError) {
    return NextResponse.json({ error: 'Could not create transaction record.' }, { status: 500 });
  }

  // If Paystack is not configured, run demo mode (no real charge)
  if (!PAYSTACK_SECRET) {
    return NextResponse.json({
      demo: true,
      reference,
      message: 'Paystack is not configured. Running in demo mode — no real charge will be made.',
    });
  }

  // Initialize Paystack transaction
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100), // Paystack expects kobo
        reference,
        callback_url: `${APP_URL}/wallet/fund/verify?reference=${reference}`,
        metadata: {
          user_id: user.id,
          purpose: 'wallet_funding',
        },
      }),
    });

    const data = await response.json();
    if (!data.status || !data.data?.authorization_url) {
      return NextResponse.json({ error: 'Paystack could not initialize payment.' }, { status: 500 });
    }

    return NextResponse.json({
      reference,
      authorization_url: data.data.authorization_url,
    });
  } catch {
    return NextResponse.json({ error: 'Could not connect to Paystack.' }, { status: 500 });
  }
}
