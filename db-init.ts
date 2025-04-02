import * as schema from './shared/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const { Pool } = pg;

/**
 * Script per inizializzare il database e creare le tabelle
 * Questo script è più semplice di drizzle-kit e usa direttamente l'API di drizzle-orm
 */
async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Errore: DATABASE_URL non definito. Assicurati che il database sia stato configurato.');
    process.exit(1);
  }

  console.log('🔄 Connessione al database PostgreSQL...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Verifica la connessione
    await pool.query('SELECT 1');
    console.log('✅ Connessione al database PostgreSQL stabilita');

    const db = drizzle(pool, { schema });

    console.log('🔄 Creazione tabelle in corso...');

    // Crea tutte le tabelle definite nello schema
    const createTablesSQL = `
    -- Crea la tabella degli utenti
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'client',
      is_barber BOOLEAN NOT NULL DEFAULT FALSE,
      image_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_approved BOOLEAN DEFAULT FALSE,
      preferred_barber_id INTEGER,
      barber_code TEXT,
      description TEXT,
      manager_id INTEGER,
      is_manager BOOLEAN NOT NULL DEFAULT FALSE,
      shop_id INTEGER,
      working_hours JSONB,
      breaks JSONB,
      closed_days JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Crea la tabella dei servizi
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      image_url TEXT,
      is_generic BOOLEAN NOT NULL DEFAULT TRUE
    );

    -- Crea la tabella degli appuntamenti
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      client_id INTEGER NOT NULL,
      barber_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      walk_in BOOLEAN NOT NULL DEFAULT FALSE
    );

    -- Crea la tabella dei messaggi
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
      is_read BOOLEAN DEFAULT FALSE NOT NULL
    );

    -- Crea la tabella delle statistiche
    CREATE TABLE IF NOT EXISTS statistics (
      id SERIAL PRIMARY KEY,
      barber_id INTEGER NOT NULL,
      date TIMESTAMP NOT NULL,
      total_appointments INTEGER NOT NULL DEFAULT 0,
      completed_appointments INTEGER NOT NULL DEFAULT 0,
      total_revenue INTEGER NOT NULL DEFAULT 0,
      new_clients INTEGER NOT NULL DEFAULT 0,
      average_rating DECIMAL(3,1) DEFAULT 0
    );

    -- Crea la tabella delle recensioni
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      barber_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Crea la tabella delle notifiche
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE NOT NULL,
      related_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Crea la tabella barber_services per associare barbieri a servizi
    CREATE TABLE IF NOT EXISTS barber_services (
      id SERIAL PRIMARY KEY,
      barber_id INTEGER NOT NULL REFERENCES users(id),
      service_id INTEGER NOT NULL REFERENCES services(id),
      price INTEGER,
      duration INTEGER,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
    
    -- Crea la tabella delle sessioni
    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR PRIMARY KEY NOT NULL,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );`;
    
    await pool.query(createTablesSQL);

    console.log('✅ Tabelle create con successo');

    // Creare un paio di servizi di default
    console.log('🔄 Creazione servizi di default...');

    await db.insert(schema.services).values([
      {
        name: "Taglio Capelli",
        description: "Taglio classico con forbici e rifinitura con rasoio.",
        price: 2000, // €20.00
        duration: 30, // 30 minutes
        imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=500&q=60",
        isGeneric: true
      },
      {
        name: "Barba Completa",
        description: "Rasatura completa con trattamento pre e post-barba.",
        price: 1500, // €15.00
        duration: 20, // 20 minutes
        imageUrl: "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=500&q=60",
        isGeneric: true
      },
      {
        name: "Taglio + Barba",
        description: "Servizio completo di taglio capelli e sistemazione barba.",
        price: 3500, // €35.00
        duration: 45, // 45 minutes
        imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=500&q=60",
        isGeneric: true
      },
      {
        name: "Shampoo + Taglio",
        description: "Shampoo professionale e taglio personalizzato.",
        price: 2500, // €25.00
        duration: 35, // 35 minutes
        imageUrl: "https://images.unsplash.com/photo-1634302066072-dcdb3244782c?auto=format&fit=crop&w=500&q=60",
        isGeneric: true
      }
    ]).execute();

    console.log('✅ Servizi di default creati con successo');
    console.log('✨ Database inizializzato con successo!');
  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione del database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

initDatabase();