const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZHRvdm9ha3hla2pya2V4YmFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjA4MSwiZXhwIjoyMDg3NjkyMDgxfQ.aAWE8zdfCm9mX5yg8vSbEFUuUTpTulVB4jijHASKk3A@db.lxdtovoakxekjrkexbae.supabase.co:5432/postgres'
});

async function main() {
  await client.connect();
  
  const sql = `
DROP POLICY IF EXISTS "Anyone can submit trainer request" ON trainer_requests;

CREATE POLICY "Anyone can submit trainer request" ON trainer_requests 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  `;
  
  await client.query(sql);
  console.log('✅ RLS policy fixed!');
  
  // Verify
  const result = await client.query(`
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'trainer_requests'
  `);
  console.log('Current policies:', JSON.stringify(result.rows, null, 2));
  
  await client.end();
}

main().catch(console.error);
