const { Client } = require("pg");
require("dotenv").config({ path: ".env.local", quiet: true });

const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const pw = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);

const tries = [
  [
    "pgbouncer-opt",
    `postgresql://postgres.${ref}:${pw}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  ],
  [
    "user-postgres-only",
    `postgresql://postgres:${pw}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  ],
  [
    "session-mode",
    `postgresql://postgres.${ref}:${pw}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  ],
  [
    "pooler-us-east-1",
    `postgresql://postgres.${ref}:${pw}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ],
];

(async () => {
  for (const [label, connectionString] of tries) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      console.log(`TRY=${label}`);
      await client.connect();
      const result = await client.query(
        "select current_database() as db, current_user as usr"
      );
      console.log("OK", result.rows[0]);
      await client.end();
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL=${label} ${message.split("\n")[0]}`);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  process.exit(1);
})();
