const CREDIT_PACKAGES = [
  { id: 'credits-1', name: 'Single Session', credits: 1, price: 150, bonusCredits: 0, description: 'Perfect for trying out a single class', isActive: true, sortOrder: 1 },
  { id: 'credits-3', name: '3-Class Pack', credits: 3, price: 450, bonusCredits: 0, description: '3 credits for classes', isActive: true, sortOrder: 2 },
  { id: 'credits-5', name: '5-Class Pack', credits: 5, price: 750, bonusCredits: 1, description: '5 credits + 1 bonus class!', isActive: true, sortOrder: 3 },
  { id: 'credits-10', name: '10-Class Pack', credits: 10, price: 1500, bonusCredits: 2, description: '10 credits + 2 bonus classes!', isActive: true, sortOrder: 4 },
];

export async function GET() {
  const packages = CREDIT_PACKAGES.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  return new Response(JSON.stringify(packages), {
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
