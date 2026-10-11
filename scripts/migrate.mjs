// Corre migrations/*.sql en orden contra DATABASE_URL, sin necesitar psql (sirve dentro del contenedor de la API).
// Cada archivo es idempotente: se puede correr más de una vez.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false });
await client.connect();
try {
  for (const f of files) {
    await client.query(await readFile(path.join(dir, f), "utf8"));
    console.log(`✔ ${f}`);
  }
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
