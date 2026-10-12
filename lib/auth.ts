import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getSql } from './db';

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

export async function createUser(fullName: string, email: string, phone: string, password: string) {
  const passwordHash = hashPassword(password);
  const [user] = await getSql() `
    INSERT INTO users (full_name, email, phone, password_hash)
    VALUES (${fullName}, ${email.toLowerCase()}, ${phone}, ${passwordHash})
    RETURNING id, full_name, email, phone, role, status
  `;
  await getSql() `INSERT INTO wallets (user_id, balance) VALUES (${user.id}, 0) ON CONFLICT (user_id) DO NOTHING`;
  return user;
}

export async function loginUser(email: string, password: string) {
  const [user] = await getSql() `SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
  if (!user || !verifyPassword(password, user.password_hash) || user.status !== 'active') return null;
  return user;
}

export async function setSession(userId: string) {
  const token = newToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  // The session token is stored as a hash so a database leak does not expose active cookies.
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await getSql() `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`;
  await getSql() `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, NOW() + INTERVAL '30 days')`;
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [user] = await getSql() `
    SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW() AND u.status = 'active'
    LIMIT 1
  `;
  return user ?? null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await getSql() `DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
  }
  cookieStore.delete(COOKIE);
}
