import pg from 'pg';

async function run() {
  console.log("Testing direct config options...");
  try {
    const pool = new pg.Pool({
      host: 'db.jhdvsnpxypszwslhsivg.supabase.co',
      port: 5432,
      user: 'postgres',
      password: 'Auxone./4646',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    const client = await pool.connect();
    console.log("🎉 SUCCESS! Connected to Supabase with direct password!");
    const res = await client.query("SELECT NOW()");
    console.log("Database time:", res.rows[0]);
    client.release();
    await pool.end();
  } catch (err: any) {
    console.error("❌ Direct connection failed:", err.message);
  }
}

run();
