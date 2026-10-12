import { NextResponse } from 'next/server';
import { createUser, setSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const password = String(body.password ?? '');
    if (!fullName || !email || !phone || password.length < 6) return NextResponse.json({ error: 'Enter all fields. Password must be at least 6 characters.' }, { status: 400 });
    const user = await createUser(fullName, email, phone, password);
    await setSession(user.id);
    return NextResponse.json({ user });
  } catch (error: any) {
    const message = error?.code === '23505' ? 'Email or phone number is already registered.' : 'Unable to create account.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
