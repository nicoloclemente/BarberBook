// Script per creare utenti di test per l'applicazione BarberBook

import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const scryptAsync = promisify(scrypt);

// Funzione per generare un hash della password
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Utenti di test da creare
const testUsers = [
  {
    username: 'admin',
    password: 'password123',
    name: 'Admin Utente',
    phone: '+391234567890',
    role: 'admin',
    isBarber: false,
    isActive: true,
    isApproved: true
  },
  {
    username: 'barber1',
    password: 'password123',
    name: 'Mario Barbiere',
    phone: '+391234567891',
    role: 'barber',
    isBarber: true,
    isActive: true,
    isApproved: true,
    barberCode: 'MARIO01',
    workingHours: {
      monday: [{ start: '09:00', end: '18:00', enabled: true }],
      tuesday: [{ start: '09:00', end: '18:00', enabled: true }],
      wednesday: [{ start: '09:00', end: '18:00', enabled: true }],
      thursday: [{ start: '09:00', end: '18:00', enabled: true }],
      friday: [{ start: '09:00', end: '18:00', enabled: true }],
      saturday: [{ start: '09:00', end: '14:00', enabled: true }],
      sunday: [{ start: '00:00', end: '00:00', enabled: false }]
    },
    breaks: [],
    closedDays: []
  },
  {
    username: 'barber2',
    password: 'password123',
    name: 'Luigi Tagliatore',
    phone: '+391234567892',
    role: 'barber',
    isBarber: true,
    isActive: true,
    isApproved: true,
    barberCode: 'LUIGI01',
    workingHours: {
      monday: [{ start: '10:00', end: '19:00', enabled: true }],
      tuesday: [{ start: '10:00', end: '19:00', enabled: true }],
      wednesday: [{ start: '10:00', end: '19:00', enabled: true }],
      thursday: [{ start: '10:00', end: '19:00', enabled: true }],
      friday: [{ start: '10:00', end: '19:00', enabled: true }],
      saturday: [{ start: '10:00', end: '16:00', enabled: true }],
      sunday: [{ start: '00:00', end: '00:00', enabled: false }]
    },
    breaks: [],
    closedDays: []
  },
  {
    username: 'client1',
    password: 'password123',
    name: 'Paolo Cliente',
    phone: '+391234567893',
    role: 'client',
    isBarber: false,
    isActive: true
  },
  {
    username: 'client2',
    password: 'password123',
    name: 'Anna Cliente',
    phone: '+391234567894',
    role: 'client',
    isBarber: false,
    isActive: true
  }
];

// Funzione principale per creare gli utenti
async function createTestUsers() {
  console.log('Iniziando la creazione degli utenti di test...');
  
  for (const userData of testUsers) {
    try {
      // Controlla se l'utente esiste già
      const checkResult = await pool.query('SELECT id FROM users WHERE username = $1', [userData.username]);
      
      if (checkResult.rows.length > 0) {
        console.log(`Utente ${userData.username} già esistente, salto la creazione.`);
        continue;
      }
      
      // Hash della password
      const hashedPassword = await hashPassword(userData.password);
      
      // Prepara i campi da inserire
      const insertData = {
        ...userData,
        password: hashedPassword,
        workingHours: userData.workingHours ? JSON.stringify(userData.workingHours) : null,
        breaks: userData.breaks ? JSON.stringify(userData.breaks) : null,
        closedDays: userData.closedDays ? JSON.stringify(userData.closedDays) : null
      };
      
      // Costruisci la query d'inserimento dinamicamente
      const fields = Object.keys(insertData)
        .filter(key => insertData[key] !== undefined)
        .map(key => {
          // Converti il nome del campo in formato snake_case per PostgreSQL
          return key.replace(/([A-Z])/g, '_$1').toLowerCase();
        });
      
      const values = Object.keys(insertData)
        .filter(key => insertData[key] !== undefined)
        .map(key => insertData[key]);
      
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders}) RETURNING id, username, name, role`;
      
      // Esegui l'inserimento
      const result = await pool.query(query, values);
      console.log(`Utente creato con successo: ${result.rows[0].username} (${result.rows[0].role})`);
    } catch (error) {
      console.error(`Errore durante la creazione dell'utente ${userData.username}:`, error);
    }
  }
  
  console.log('Creazione utenti completata!');
  
  // Salva le credenziali in un file per riferimento
  const credentials = testUsers.map(user => ({
    username: user.username,
    password: 'password123',
    role: user.role
  }));
  
  fs.writeFileSync('test-user-credentials.json', JSON.stringify(credentials, null, 2));
  console.log('Credenziali salvate in test-user-credentials.json');
  
  // Chiudi la connessione al pool
  await pool.end();
}

// Esegui la funzione principale come IIFE
(async () => {
  try {
    await createTestUsers();
  } catch (error) {
    console.error('Errore durante l\'esecuzione dello script:', error);
    process.exit(1);
  }
})();