import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import './firebaseAdmin';
import { connectToDatabase } from './mongodb';
import User from './models/User';
import { SUPER_ADMIN_EMAIL } from './types';

export type RequesterRole = 'user' | 'admin' | 'super_admin';

export interface Requester {
  uid: string;
  email: string;
  role: RequesterRole;
  dbId?: string;
}

/**
 * ID-token verification only needs the Firebase project id (Google's public keys are fetched
 * automatically) — no service-account private key. Using a dedicated app means sign-in checks keep
 * working even if the admin credentials are missing, malformed or being rotated.
 */
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'shopify-catering-service';

function getVerifierAuth(): admin.auth.Auth | null {
  try {
    const name = 'id-token-verifier';
    const existing = admin.apps.find((a) => a?.name === name);
    const app = existing || admin.initializeApp({ projectId: FIREBASE_PROJECT_ID }, name);
    return app.auth();
  } catch (e) {
    console.warn('ID token verifier init failed:', e);
    return null;
  }
}

// Small per-instance cache so every API call doesn't re-verify + re-query the role
const requesterCache = new Map<string, { value: Requester; expires: number }>();
const CACHE_MS = 60 * 1000;

/**
 * Identifies the caller from the Firebase ID token sent as `Authorization: Bearer <token>`.
 * The role is read from MongoDB (authoritative), never from the request body.
 */
export async function getRequester(request: Request): Promise<Requester | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const verifier = getVerifierAuth();
  if (!verifier) return null;

  const cached = requesterCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const decoded = await verifier.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase().trim();
    let role: RequesterRole = 'user';
    let dbId: string | undefined;

    if (email && email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      role = 'super_admin';
    } else {
      try {
        await connectToDatabase();
        if (User) {
          const doc: any = await User.findOne({ $or: [{ email }, { uid: decoded.uid }] })
            .select('role _id')
            .lean();
          if (doc) {
            dbId = doc._id?.toString();
            if (doc.role === 'admin' || doc.role === 'super_admin') role = doc.role;
          }
        }
      } catch {
        // fall through as plain user
      }
    }

    const value: Requester = { uid: decoded.uid, email, role, dbId };
    requesterCache.set(token, { value, expires: Date.now() + CACHE_MS });
    if (requesterCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of requesterCache) if (v.expires < now) requesterCache.delete(k);
    }
    return value;
  } catch (e: any) {
    console.warn('ID token verification failed:', e?.code || e?.message);
    return null;
  }
}

export function isAdminRole(r: Requester | null | undefined): boolean {
  return !!r && (r.role === 'admin' || r.role === 'super_admin');
}

/** True when the requester is the account identified by any of the given id/email values. */
export function isSelf(r: Requester | null | undefined, ...ids: Array<string | undefined | null>): boolean {
  if (!r) return false;
  return ids.some((v) => {
    const s = (v || '').toString().toLowerCase().trim();
    return !!s && (s === r.email || s === r.uid.toLowerCase() || (!!r.dbId && s === r.dbId.toLowerCase()));
  });
}

export const unauthorized = (msg = 'Please sign in again.') =>
  NextResponse.json({ success: false, error: msg }, { status: 401 });

export const forbidden = (msg = 'You do not have permission for this action.') =>
  NextResponse.json({ success: false, error: msg }, { status: 403 });

/** Returns the requester, or a 401/403 response to return directly. */
export async function requireUser(request: Request): Promise<Requester | NextResponse> {
  const r = await getRequester(request);
  return r || unauthorized();
}

export async function requireAdmin(request: Request): Promise<Requester | NextResponse> {
  const r = await getRequester(request);
  if (!r) return unauthorized();
  if (!isAdminRole(r)) return forbidden('Admin access required.');
  return r;
}

export async function requireSuperAdmin(request: Request): Promise<Requester | NextResponse> {
  const r = await getRequester(request);
  if (!r) return unauthorized();
  if (r.role !== 'super_admin') return forbidden('Super admin access required.');
  return r;
}
