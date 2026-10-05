/**
 * Supabase'e SQL dosyası uygular.
 * Kullanım: SUPABASE_DB_PASSWORD=... node scripts/run-sql.js supabase/run_all.sql
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: ".env.local", quiet: true });

const sqlPath = process.argv[2] || "supabase/run_all.sql";
const password = process.env.SUPABASE_DB_PASSWORD;

if (!password) {
  console.error("SUPABASE_DB_PASSWORD eksik.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  console.error("NEXT_PUBLIC_SUPABASE_URL eksik.");
  process.exit(1);
}

const ref = new URL(url).hostname.split(".")[0];
const sql = fs.readFileSync(path.resolve(sqlPath), "utf8");

const regions = [
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-north-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ap-southeast-1",
  "ap-northeast-1",
];

const candidates = [];

for (const region of regions) {
  for (const aws of ["aws-0", "aws-1"]) {
    // Session mode (5432) genelde DDL için daha uygun
    candidates.push({
      label: `${aws}-${region}-session`,
      config: {
        host: `${aws}-${region}.pooler.supabase.com`,
        port: 5432,
        database: "postgres",
        user: `postgres.${ref}`,
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 12000,
      },
    });
    candidates.push({
      label: `${aws}-${region}-transaction`,
      config: {
        host: `${aws}-${region}.pooler.supabase.com`,
        port: 6543,
        database: "postgres",
        user: `postgres.${ref}`,
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 12000,
      },
    });
  }
}

async function runWith(label, config) {
  const client = new Client(config);
  console.log(`TRY=${label}`);
  await client.connect();
  console.log(`CONNECTED=${label}`);
  await client.query(sql);

  const counts = await client.query(`
    select
      (select count(*)::int from public.companies) as companies,
      (select count(*)::int from public.contacts) as contacts,
      (select count(*)::int from public.leads) as leads
  `);

  console.log(`COUNTS=${JSON.stringify(counts.rows[0])}`);
  await client.end();
}

(async () => {
  for (const candidate of candidates) {
    try {
      await runWith(candidate.label, candidate.config);
      console.log("SUCCESS");
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL=${candidate.label} msg=${message.split("\n")[0]}`);
    }
  }

  console.error("ALL_FAILED");
  process.exit(1);
})();
