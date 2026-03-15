export async function GET() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID || '';
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY || '';
  const mode = process.env.PAYFAST_MODE || 'sandbox';
  
  const isConfigured = !!(merchantId && merchantKey);
  
  return new Response(JSON.stringify({
    isConfigured,
    mode,
    merchantId: merchantId ? `${merchantId.substring(0, 4)}...` : '',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Vercel serverless handler
export default async function handler(request: Request) {
  switch (request.method) {
    case 'GET':
      return GET();
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}
