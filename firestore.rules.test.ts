/**
 * Phase 0: Security Rules Verification Suite for KramaView Pro
 * Verifies that all Dirty Dozen adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface DirtyPayloadTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'get' | 'list';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyPayloadTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Create',
    collection: 'savedAnalyses',
    docId: 'analysis_01',
    operation: 'create',
    authUid: 'attacker_uid_111',
    emailVerified: true,
    payload: { ownerId: 'victim_uid_999', title: 'Spoofed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    collection: 'priceAlerts',
    docId: 'alert_01',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: false,
    payload: { ownerId: 'user_1', symbol: 'BTC/USDT' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Create',
    collection: 'priceAlerts',
    docId: 'alert_01',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { ownerId: 'user_1', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Update',
    collection: 'savedAnalyses',
    docId: 'analysis_01',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { hacked: 'yes' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Ownership Hijack on Update',
    collection: 'priceAlerts',
    docId: 'alert_01',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { ownerId: 'user_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Timestamp Forgery',
    collection: 'alertLogs',
    docId: 'log_01',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { ownerId: 'user_1', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning Attack',
    collection: 'savedAnalyses',
    docId: 'invalid$id!with_spaces',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { ownerId: 'user_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Denial of Wallet String Overflow',
    collection: 'savedAnalyses',
    docId: 'analysis_01',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { ownerId: 'user_1', notes: 'x'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unbounded Array Exhaustion',
    collection: 'savedAnalyses',
    docId: 'analysis_01',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { ownerId: 'user_1', indicators: [12345] },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'PII Cross-Tenant Read',
    collection: 'notificationConfigs',
    docId: 'victim_uid',
    operation: 'get',
    authUid: 'attacker_uid',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unfiltered List Scraping',
    collection: 'savedAnalyses',
    docId: '*',
    operation: 'list',
    authUid: 'attacker_uid',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Value Poisoning on Update',
    collection: 'priceAlerts',
    docId: 'alert_01',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { status: 'hacked_status' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
