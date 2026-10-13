import { NextResponse } from 'next/server';
import { loginUser, setSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json();
  const user = await loginUser(String(body.email ?? '').trim(), String(body.password ?? ''));
  if (!user) return NextResponse.json({ error: 'Invalid email, password, or account status.' }, { status: 401 });
  await setSession(user.id);
  return NextResponse.json({
    user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role },
  });
}
