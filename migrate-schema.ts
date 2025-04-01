import * as schema from './shared/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool } from './server/db';

/**
 * Script per la migrazione del database basato sullo schema Drizzle attuale
 * Questo script crea tutte le tabelle necessarie per l'applicazione
 * Eseguire con: npm run db:push (vedi il package.json)
 */
async function migrateSchema() {
  console.log('🔄 Avvio migrazione schema...');
  
  const db = drizzle(pool, { schema });

  try {
    // Esegue la migrazione basata sugli schema
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('✅ Migrazione completata con successo!');
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
  }
  
  console.log('✨ Database pronto all\'uso');
  process.exit(0);
}

migrateSchema();