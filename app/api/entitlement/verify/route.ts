export const dynamic = 'force-dynamic';

type StoreEvidence = { store: 'apple' | 'google'; productId: string; purchaseToken?: string; transactionId?: string };

function parseEvidence(value: unknown): StoreEvidence | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const allowed = new Set(['store', 'productId', 'purchaseToken', 'transactionId']);
  if (Object.keys(record).some((key) => !allowed.has(key))) return null;
  if (record.store !== 'apple' && record.store !== 'google') return null;
  if (typeof record.productId !== 'string' || record.productId.length === 0) return null;
  if (record.purchaseToken !== undefined && typeof record.purchaseToken !== 'string') return null;
  if (record.transactionId !== undefined && typeof record.transactionId !== 'string') return null;
  if (!record.purchaseToken && !record.transactionId) return null;
  return record as StoreEvidence;
}

export async function POST(request: Request) {
  const expectedProductId = process.env.C3_STORE_PRODUCT_ID;
  const verifierUrl = process.env.C3_STORE_VERIFIER_URL;
  const verifierToken = process.env.C3_STORE_VERIFIER_TOKEN;
  if (!expectedProductId || !verifierUrl || !verifierToken) return Response.json({ error: 'ENTITLEMENT_VERIFIER_NOT_CONFIGURED' }, { status: 503 });
  let evidence: StoreEvidence | null = null;
  try { evidence = parseEvidence(await request.json()); } catch { evidence = null; }
  if (!evidence) return Response.json({ error: 'INVALID_STORE_EVIDENCE' }, { status: 400 });
  if (evidence.productId !== expectedProductId) return Response.json({ error: 'PRODUCT_MISMATCH' }, { status: 400 });
  const target = new URL(verifierUrl);
  if (target.protocol !== 'https:') return Response.json({ error: 'ENTITLEMENT_VERIFIER_NOT_CONFIGURED' }, { status: 503 });
  const upstream = await fetch(target, { method: 'POST', headers: { authorization: `Bearer ${verifierToken}`, 'content-type': 'application/json' }, body: JSON.stringify(evidence), cache: 'no-store' });
  if (!upstream.ok) return Response.json({ error: 'STORE_VERIFICATION_FAILED' }, { status: 502 });
  const result = await upstream.json() as Record<string, unknown>;
  if (result.owned !== true || result.productId !== evidence.productId || result.store !== evidence.store || result.transactionStatus !== 'VERIFIED' || typeof result.verifiedAt !== 'string') {
    return Response.json({ error: 'INVALID_VERIFIER_RESPONSE' }, { status: 502 });
  }
  return Response.json({ owned: true, productId: evidence.productId, store: evidence.store, verifiedAt: result.verifiedAt, transactionStatus: 'VERIFIED' }, { headers: { 'cache-control': 'no-store' } });
}
