import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  const isDemo = searchParams.get('demo') === '1';

  if (!reference) {
    return NextResponse.json({ error: 'Missing payment reference.' }, { status: 400 });
  }

  // Find the pending transaction
  const { data: tx } = await db
    .from('transactions')
    .select('id, user_id, amount, status, reference')
    .eq('reference', reference)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
  }

  if (tx.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  // Already processed
  if (tx.status === 'successful') {
    const { data: wallet } = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    return NextResponse.json({ success: true, amount: tx.amount, balance: wallet?.balance ?? 0 });
  }

  // Demo mode: credit wallet without real payment (for testing only)
  if (isDemo || !PAYSTACK_SECRET) {
    const { data: result } = await db.rpc('credit_wallet_balance', {
      p_user_id: user.id,
      p_amount: tx.amount,
      p_reference: reference,
    });

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Could not credit wallet.' }, { status: 500 });
    }

    const row = result[0];

    // Mark transaction as successful (if not already by the RPC idempotency check)
    if (!row.already_processed) {
      await db.from('transactions').update({ status: 'successful' }).eq('reference', reference);
    }

    return NextResponse.json({ success: true, amount: tx.amount, balance: row.new_balance });
  }

  // Real Paystack verification
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });

    const data = await response.json();

    if (!data.status || data.data?.status !== 'success') {
      await db.from('transactions').update({ status: 'failed' }).eq('reference', reference);
      return NextResponse.json({ error: 'Payment was not successful.' });
    }

    // Verify the amount matches what we recorded
    const paidAmount = data.data.amount / 100; // Convert from kobo to naira
    if (paidAmount !== Number(tx.amount)) {
      await db.from('transactions').update({ status: 'failed' }).eq('reference', reference);
      return NextResponse.json({ error: 'Amount mismatch. Contact support.' });
    }

    // Verify the reference matches
    if (data.data.reference !== reference) {
      return NextResponse.json({ error: 'Reference mismatch. Contact support.' });
    }

    // Credit wallet atomically (idempotent — duplicate calls won't double-credit)
    const { data: result, error: creditError } = await db.rpc('credit_wallet_balance', {
      p_user_id: user.id,
      p_amount: tx.amount,
      p_reference: reference,
    });

    if (creditError || !result || result.length === 0) {
      return NextResponse.json({ error: 'Could not credit wallet. Contact support.' }, { status: 500 });
    }

    const row = result[0];

    if (!row.already_processed) {
      await db.from('transactions').update({ status: 'successful', paystack_reference: data.data.id }).eq('reference', reference);
    }

    return NextResponse.json({ success: true, amount: tx.amount, balance: row.new_balance });
  } catch {
    return NextResponse.json({ error: 'Could not verify payment with Paystack.' }, { status: 500 });
  }
}
