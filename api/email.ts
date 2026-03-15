/**
 * Email Status API - Simple endpoint for Vercel
 */

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        provider: process.env.RESEND_API_KEY ? 'resend' : 'none',
        configured: !!process.env.RESEND_API_KEY,
        env: {
          resendApiKeySet: !!process.env.RESEND_API_KEY,
          senderEmail: process.env.EMAIL_SENDER_EMAIL || 'hello@pausefmd.co.za',
          senderName: process.env.EMAIL_SENDER_NAME || 'Pause Fascia Movement',
        }
      }),
      { status: 200, headers }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers }
  );
}
