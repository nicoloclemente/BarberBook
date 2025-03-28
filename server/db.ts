import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

// Connessione al database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Esporta l'istanza drizzle per l'uso in tutta l'applicazione
export const db = drizzle(pool, { schema });
export { pool };