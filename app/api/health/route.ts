export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = Boolean(process.env.C3_STORE_PRODUCT_ID && process.env.C3_STORE_VERIFIER_URL && process.env.C3_STORE_VERIFIER_TOKEN);
  return Response.json({ service: 'discover-entitlement-resolver', releaseId: 'C3-01', configured, stores: configured ? ['apple', 'google'] : [] }, { headers: { 'cache-control': 'no-store' } });
}
