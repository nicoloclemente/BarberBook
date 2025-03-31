/**
 * Script per creare utenti di test per l'applicazione Barber Shop
 */
import { db } from './server/db';
import { users, UserRole } from './shared/schema';
import bcrypt from 'bcryptjs';

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function createTestUsers() {
  console.log('Creazione utenti di test...');

  // Password comune per facilità di test
  const hashedPassword = await hashPassword('password123');

  // AMMINISTRATORE
  const admin = {
    username: 'admin',
    password: hashedPassword,
    name: 'Amministratore',
    phone: '+39 345 0000000',
    role: UserRole.ADMIN,
    isBarber: false,
    isActive: true,
    isApproved: true,
    imageUrl: null,
    barberCode: null,
    preferredBarberId: null,
    workingHours: null,
    breaks: null,
    closedDays: null
  };

  // BARBIERI
  const barbers = [
    {
      username: 'marco',
      password: hashedPassword,
      name: 'Marco Rossi',
      phone: '+39 345 1111111',
      role: UserRole.BARBER,
      isBarber: true,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: 'MARCO123',
      preferredBarberId: null,
      workingHours: JSON.stringify({
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: { start: '09:00', end: '13:00' },
        sunday: null
      }),
      breaks: null,
      closedDays: null
    },
    {
      username: 'luca',
      password: hashedPassword,
      name: 'Luca Bianchi',
      phone: '+39 345 2222222',
      role: UserRole.BARBER,
      isBarber: true,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: 'LUCA456',
      preferredBarberId: null,
      workingHours: JSON.stringify({
        monday: { start: '10:00', end: '19:00' },
        tuesday: { start: '10:00', end: '19:00' },
        wednesday: { start: '10:00', end: '19:00' },
        thursday: { start: '10:00', end: '19:00' },
        friday: { start: '10:00', end: '19:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: null
      }),
      breaks: null,
      closedDays: null
    },
    {
      username: 'giuseppe',
      password: hashedPassword,
      name: 'Giuseppe Verdi',
      phone: '+39 345 3333333',
      role: UserRole.BARBER,
      isBarber: true,
      isActive: true,
      isApproved: false, // In attesa di approvazione
      imageUrl: null,
      barberCode: 'GIUSEP789',
      preferredBarberId: null,
      workingHours: null,
      breaks: null,
      closedDays: null
    }
  ];

  // CLIENTI
  const clients = [
    // Clienti collegati a Marco
    {
      username: 'andrea',
      password: hashedPassword,
      name: 'Andrea Ferrari',
      phone: '+39 345 4444444',
      role: UserRole.CLIENT,
      isBarber: false,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: 'MARCO123',
      preferredBarberId: null,
      workingHours: null,
      breaks: null,
      closedDays: null
    },
    {
      username: 'paolo',
      password: hashedPassword,
      name: 'Paolo Neri',
      phone: '+39 345 5555555',
      role: UserRole.CLIENT,
      isBarber: false,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: 'MARCO123',
      preferredBarberId: null,
      workingHours: null,
      breaks: null,
      closedDays: null
    },
    // Clienti collegati a Luca
    {
      username: 'roberto',
      password: hashedPassword,
      name: 'Roberto Esposito',
      phone: '+39 345 6666666',
      role: UserRole.CLIENT,
      isBarber: false,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: 'LUCA456',
      preferredBarberId: null,
      workingHours: null,
      breaks: null,
      closedDays: null
    },
    // Clienti senza collegamento a un barbiere
    {
      username: 'mario',
      password: hashedPassword,
      name: 'Mario Rossi',
      phone: '+39 345 7777777',
      role: UserRole.CLIENT,
      isBarber: false,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: null, // Nessun codice barbiere
      preferredBarberId: null,
      workingHours: null,
      breaks: null,
      closedDays: null
    },
    {
      username: 'stefano',
      password: hashedPassword,
      name: 'Stefano Bianchi',
      phone: '+39 345 8888888',
      role: UserRole.CLIENT,
      isBarber: false,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: null, // Nessun codice barbiere
      preferredBarberId: null,
      workingHours: null,
      breaks: null,
      closedDays: null
    }
  ];

  try {
    // Pulisci il database prima
    try {
      await db.delete(users);
      console.log('✅ Database pulito con successo');
    } catch (error) {
      console.error('⚠️ Errore durante la pulizia del database:', error);
    }

    // Inserisci admin
    await db.insert(users).values(admin);
    console.log('✅ Admin creato con successo');

    // Inserisci barbieri
    for (const barber of barbers) {
      await db.insert(users).values(barber);
    }
    console.log('✅ Barbieri creati con successo');

    // Inserisci clienti
    for (const client of clients) {
      await db.insert(users).values(client);
    }
    console.log('✅ Clienti creati con successo');

    console.log('\nInformazioni di accesso:');
    console.log('- Admin: username = admin, password = password123');
    console.log('- Barbiere Marco: username = marco, password = password123, codice = MARCO123');
    console.log('- Barbiere Luca: username = luca, password = password123, codice = LUCA456');
    console.log('- Barbiere Giuseppe (non approvato): username = giuseppe, password = password123, codice = GIUSEP789');
    console.log('- Clienti di Marco: andrea, paolo');
    console.log('- Cliente di Luca: roberto');
    console.log('- Clienti senza barbiere: mario, stefano');
    console.log('\nTutti gli utenti hanno password = password123');

  } catch (error) {
    console.error('❌ Errore durante la creazione degli utenti di test:', error);
  }
}

createTestUsers()
  .then(() => {
    console.log('✨ Completato!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Errore:', err);
    process.exit(1);
  });