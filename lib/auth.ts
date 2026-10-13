import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { db } from './db';

export type SafeUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
};

const COOKIE = 'fist_session';

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(key, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createUser(fullName: string, email: string, phone: string, password: string): Promise<SafeUser> {
  const passwordHash = hashPassword(password);

  const { data: user, error } = await db
    .from('users')
    .insert({ full_name: fullName, email: email.toLowerCase(), phone, password_hash: passwordHash })
    .select('id, full_name, email, phone, role, status')
    .single();

  if (error) throw error;

  await db.from('wallets').insert({ user_id: user.id, balance: 0 });

  return user;
}

export async function loginUser(email: string, password: string): Promise<SafeUser | null> {
  const { data: user } = await db
    .from('users')
    .select('id, full_name, email, phone, role, status, password_hash')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!user || !verifyPassword(password, user.password_hash) || user.status !== 'active') return null;

  const { password_hash, ...safe } = user;
  return safe as SafeUser;
}

export async function setSession(userId: string) {
  const token = newToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.from('sessions').insert({
    token_hash: tokenHash,
    user_id: userId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: row } = await db
    .from('sessions')
    .select('user_id, expires_at, users!inner(id, full_name, email, phone, role, status)')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!row || !row.users) return null;

  const u = row.users;
  if (u.status !== 'active') return null;

  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    phone: u.phone,
    role: u.role as 'user' | 'admin',
    status: u.status as 'active' | 'suspended',
  };
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.from('sessions').delete().eq('token_hash', tokenHash);
  }
  cookieStore.delete(COOKIE);
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const { data: user } = await db
    .from('users')
    .select('id, full_name, email, phone, role, status')
    .eq('id', userId)
    .maybeSingle();

  return user as SafeUser | null;
}
