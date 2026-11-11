import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Blueprint Validation Constants (Synced verbatim with firebase-blueprint.json & firestore.rules)
export const BLUEPRINT_LIMITS = {
  ID_MAX_LEN: 128,
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  SYMBOL_MAX_LEN: 24,
  SYMBOL_REGEX: /^[A-Z0-9\-/]+$/,
  TITLE_MAX_LEN: 120,
  NOTES_MAX_LEN: 2000,
  ALERT_NOTE_MAX_LEN: 300,
  REVIEW_NOTE_MAX_LEN: 500,
  INDICATORS_MAX_ITEMS: 10,
  DRAWINGS_MAX_ITEMS: 50,
  EMAIL_MAX_LEN: 160,
  WEBHOOK_MAX_LEN: 300,
  TG_TOKEN_MAX_LEN: 160,
  TG_CHAT_MAX_LEN: 64,
};

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, BLUEPRINT_LIMITS.ID_MAX_LEN);
  return cleaned || `id_${Date.now()}`;
}

export function sanitizeSymbol(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9\-/]/g, '').slice(0, BLUEPRINT_LIMITS.SYMBOL_MAX_LEN);
  return cleaned || 'BTC/USDT';
}

export function sanitizeString(raw: string, maxLen: number, fallback = ''): string {
  const trimmed = String(raw ?? '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

export { signInWithPopup, signOut, serverTimestamp };
