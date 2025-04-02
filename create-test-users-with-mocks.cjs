/**
 * Script per creare utenti di test, appuntamenti, messaggi e notifiche per l'applicazione Barber Shop
 */
const { db } = require('./server/db');
const { users, UserRole, appointments, messages, notifications, barberServices } = require('./shared/schema');
const bcrypt = require('bcryptjs');
const { addDays, addHours, addMinutes, setHours, setMinutes, format } = require('date-fns');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Funzione per generare una data random nei prossimi 15 giorni
function randomFutureDate(maxDays = 15) {
  const today = new Date();
  const daysToAdd = Math.floor(Math.random() * maxDays) + 1;
  const hours = [9, 10, 11, 14, 15, 16, 17];
  const minutes = [0, 30];
  
  const date = addDays(today, daysToAdd);
  const hour = hours[Math.floor(Math.random() * hours.length)];
  const minute = minutes[Math.floor(Math.random() * minutes.length)];
  
  return setMinutes(setHours(date, hour), minute);
}

// Funzione per generare una data passata entro 30 giorni
function randomPastDate(maxDays = 30) {
  const today = new Date();
  const daysToSubtract = Math.floor(Math.random() * maxDays) + 1;
  const hours = [9, 10, 11, 14, 15, 16, 17];
  const minutes = [0, 30];
  
  const date = addDays(today, -daysToSubtract);
  const hour = hours[Math.floor(Math.random() * hours.length)];
  const minute = minutes[Math.floor(Math.random() * minutes.length)];
  
  return setMinutes(setHours(date, hour), minute);
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
      isManager: true, // Marco è un barbiere capo (manager)
      description: 'Barbiere esperto con 15 anni di esperienza',
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
      isManager: true, // Luca è un barbiere capo (manager)
      description: 'Specializzato in tagli moderni e barba',
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
      isManager: false,
      description: 'Esperto in tecniche tradizionali',
      workingHours: null,
      breaks: null,
      closedDays: null
    },
    {
      username: 'francesca',
      password: hashedPassword,
      name: 'Francesca Ricci',
      phone: '+39 345 4444444',
      role: UserRole.BARBER,
      isBarber: true,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: 'FRANC123',
      preferredBarberId: null,
      managerId: 1, // Dipendente di Marco (ID 1)
      isManager: false,
      description: 'Specializzata in styling moderno',
      workingHours: JSON.stringify({
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: null,
        sunday: null
      }),
      breaks: null,
      closedDays: null
    },
    {
      username: 'davide',
      password: hashedPassword,
      name: 'Davide Conti',
      phone: '+39 345 5555555',
      role: UserRole.BARBER,
      isBarber: true,
      isActive: true,
      isApproved: true,
      imageUrl: null,
      barberCode: 'DAVID456',
      preferredBarberId: null,
      managerId: 2, // Dipendente di Luca (ID 2)
      isManager: false,
      description: 'Esperto in barba e rasature',
      workingHours: JSON.stringify({
        monday: null,
        tuesday: { start: '10:00', end: '19:00' },
        wednesday: { start: '10:00', end: '19:00' },
        thursday: { start: '10:00', end: '19:00' },
        friday: { start: '10:00', end: '19:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: null
      }),
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
      await db.delete(messages);
      await db.delete(notifications);
      await db.delete(appointments);
      await db.delete(barberServices);
      await db.delete(users);
      console.log('✅ Database pulito con successo');
    } catch (error) {
      console.error('⚠️ Errore durante la pulizia del database:', error);
    }

    // Inserisci admin
    await db.insert(users).values(admin);
    console.log('✅ Admin creato con successo');

    // Inserisci barbieri
    await db.insert(users).values(barbers);
    console.log('✅ Barbieri creati con successo');

    // Inserisci clienti
    await db.insert(users).values(clients);
    console.log('✅ Clienti creati con successo');
    
    // Creazione di associazioni barbiere-servizi
    // Supponiamo di avere un totale di 6 servizi (ID da 1 a 6)
    const barberServicesData = [
      // Marco (ID 1) offre tutti i servizi
      { barberId: 1, serviceId: 1, price: 2000, duration: 30 },
      { barberId: 1, serviceId: 2, price: 1500, duration: 20 },
      { barberId: 1, serviceId: 3, price: 3500, duration: 45 },
      { barberId: 1, serviceId: 4, price: 2500, duration: 35 },
      { barberId: 1, serviceId: 5, price: 3000, duration: 40 },
      { barberId: 1, serviceId: 6, price: 2000, duration: 25 },
      
      // Luca (ID 2) offre solo alcuni servizi, con prezzi diversi
      { barberId: 2, serviceId: 1, price: 2200, duration: 35 }, // Un po' più caro
      { barberId: 2, serviceId: 2, price: 1800, duration: 25 }, // Un po' più caro
      { barberId: 2, serviceId: 3, price: 3800, duration: 50 }, // Un po' più caro
      { barberId: 2, serviceId: 6, price: 2200, duration: 30 }, // Un po' più caro
      
      // Francesca (ID 4) offre servizi a prezzi leggermente scontati
      { barberId: 4, serviceId: 1, price: 1800, duration: 30 }, // Un po' meno caro
      { barberId: 4, serviceId: 3, price: 3200, duration: 40 }, // Un po' meno caro
      { barberId: 4, serviceId: 4, price: 2300, duration: 30 }, // Un po' meno caro
      
      // Davide (ID 5) si specializza in rasature
      { barberId: 5, serviceId: 2, price: 1600, duration: 25 },
      { barberId: 5, serviceId: 6, price: 1800, duration: 20 }
    ];
    
    for (const barberService of barberServicesData) {
      await db.insert(barberServices).values(barberService);
    }
    console.log('✅ Associazioni barbiere-servizi create con successo');
    
    // Creazione di appuntamenti
    // Usiamo alcuni degli ID utente (barbieri: 1, 2, 4, 5 | clienti: 6, 7, 8, 9, 10)
    const appointmentStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    
    // Appuntamenti passati (completati o cancellati)
    const pastAppointments = [];
    for (let i = 0; i < 30; i++) {
      const barberId = [1, 2, 4, 5][Math.floor(Math.random() * 4)];
      const clientId = [6, 7, 8, 9, 10][Math.floor(Math.random() * 5)];
      const serviceId = Math.floor(Math.random() * 6) + 1;
      const status = i % 10 === 0 ? 'cancelled' : 'completed'; // 10% cancellati, 90% completati
      
      pastAppointments.push({
        date: randomPastDate(),
        clientId,
        barberId,
        serviceId,
        status,
        notes: i % 5 === 0 ? 'Nota speciale per questo appuntamento' : null,
        walkIn: i % 7 === 0 // Circa 14% sono walk-in
      });
    }
    
    // Appuntamenti futuri (in attesa o confermati)
    const futureAppointments = [];
    for (let i = 0; i < 15; i++) {
      const barberId = [1, 2, 4, 5][Math.floor(Math.random() * 4)];
      const clientId = [6, 7, 8, 9, 10][Math.floor(Math.random() * 5)];
      const serviceId = Math.floor(Math.random() * 6) + 1;
      const status = i % 3 === 0 ? 'pending' : 'confirmed'; // 33% in attesa, 67% confermati
      
      futureAppointments.push({
        date: randomFutureDate(),
        clientId,
        barberId,
        serviceId,
        status,
        notes: i % 5 === 0 ? 'Richieste particolari per questo appuntamento' : null,
        walkIn: false // Gli appuntamenti futuri non possono essere walk-in
      });
    }
    
    // Creazione appuntamenti per oggi
    const todayAppointments = [];
    const today = new Date();
    const hours = [9, 10, 11, 14, 15, 16, 17];
    
    for (let i = 0; i < 5; i++) {
      const barberId = [1, 2, 4, 5][Math.floor(Math.random() * 4)];
      const clientId = [6, 7, 8, 9, 10][Math.floor(Math.random() * 5)];
      const serviceId = Math.floor(Math.random() * 6) + 1;
      const hour = hours[i % hours.length]; // Orari distribuiti
      const minute = i % 2 === 0 ? 0 : 30;
      
      const appointmentDate = new Date(today);
      appointmentDate.setHours(hour, minute, 0, 0);
      
      // Se l'ora è già passata, mark come completato, altrimenti confermato
      const status = appointmentDate < new Date() ? 'completed' : 'confirmed';
      
      todayAppointments.push({
        date: appointmentDate,
        clientId,
        barberId,
        serviceId,
        status,
        notes: i === 2 ? 'Appuntamento per oggi con note speciali' : null,
        walkIn: i === 4 // L'ultimo appuntamento è walk-in
      });
    }
    
    // Inseriamo tutti gli appuntamenti nel DB
    const allAppointments = [...pastAppointments, ...futureAppointments, ...todayAppointments];
    for (const appointment of allAppointments) {
      await db.insert(appointments).values(appointment);
    }
    console.log(`✅ Creati ${allAppointments.length} appuntamenti di test`);
    
    // Creazione messaggi tra utenti
    const messageContents = [
      "Ciao, vorrei prenotare un appuntamento",
      "Salve, è disponibile per giovedì prossimo?",
      "Buongiorno, posso spostare il mio appuntamento?",
      "Avrei bisogno di un taglio urgente, ha disponibilità?",
      "Mi conferma l'appuntamento per domani?",
      "Grazie per il servizio, è stato ottimo",
      "Quale prodotto mi consiglia per i capelli ricci?",
      "Quanto dura in media un appuntamento per barba e capelli?",
      "Posso portare mio figlio con me all'appuntamento?",
      "Avete prodotti in vendita per la cura della barba?"
    ];
    
    const testMessages = [];
    
    // Crea conversazioni tra clienti e barbieri
    for (let barberIdx = 0; barberIdx < 4; barberIdx++) {
      const barberId = barberIdx + 1; // Barbieri hanno ID da 1 a 5
      
      for (let clientIdx = 0; clientIdx < 3; clientIdx++) {
        const clientId = clientIdx + 6; // Clienti hanno ID da 6 a 10
        
        // Simula una conversazione di 3-7 messaggi
        const messagesCount = Math.floor(Math.random() * 5) + 3;
        let lastMessageTimestamp = addDays(new Date(), -14); // Inizia 14 giorni fa
        
        for (let i = 0; i < messagesCount; i++) {
          // Alterna mittente e destinatario per simulare una conversazione
          const senderId = i % 2 === 0 ? clientId : barberId;
          const receiverId = i % 2 === 0 ? barberId : clientId;
          
          // Aumenta il timestamp di ogni messaggio di 1-24 ore
          lastMessageTimestamp = addHours(lastMessageTimestamp, Math.floor(Math.random() * 24) + 1);
          
          testMessages.push({
            senderId,
            receiverId,
            content: messageContents[Math.floor(Math.random() * messageContents.length)],
            timestamp: lastMessageTimestamp,
            isRead: lastMessageTimestamp < addDays(new Date(), -1) // Messaggi più vecchi di 1 giorno sono letti
          });
        }
      }
    }
    
    // Inseriamo tutti i messaggi nel DB
    for (const message of testMessages) {
      await db.insert(messages).values(message);
    }
    console.log(`✅ Creati ${testMessages.length} messaggi di test`);
    
    // Creazione notifiche
    const notificationTitles = [
      "Appuntamento confermato",
      "Promemoria appuntamento",
      "Appuntamento annullato",
      "Nuova richiesta di appuntamento",
      "Nuovo barbiere disponibile",
      "Messaggio non letto",
      "Promozione speciale",
      "Chiusura straordinaria"
    ];
    
    const notificationContents = [
      "Il tuo appuntamento è stato confermato. Ti aspettiamo!",
      "Ricorda il tuo appuntamento di domani alle {time}",
      "Il tuo appuntamento è stato annullato. Contattaci per riprogrammarlo.",
      "Hai una nuova richiesta di appuntamento da {client}",
      "Un nuovo barbiere si è unito al nostro team. Prenota ora!",
      "Hai messaggi non letti da {sender}",
      "Questa settimana 20% di sconto su tutti i trattamenti barba",
      "Il negozio sarà chiuso il giorno {date} per manutenzione"
    ];
    
    const testNotifications = [];
    
    // Crea notifiche per tutti gli utenti
    for (let userId = 1; userId <= 10; userId++) {
      // Ogni utente riceve 2-5 notifiche
      const notificationCount = Math.floor(Math.random() * 4) + 2;
      
      for (let i = 0; i < notificationCount; i++) {
        const titleIndex = Math.floor(Math.random() * notificationTitles.length);
        let content = notificationContents[titleIndex];
        
        // Sostituisci i placeholder con valori plausibili
        if (content.includes("{time}")) {
          content = content.replace("{time}", ["9:00", "10:30", "14:00", "16:30"][Math.floor(Math.random() * 4)]);
        }
        if (content.includes("{client}")) {
          content = content.replace("{client}", ["Andrea Ferrari", "Paolo Neri", "Roberto Esposito"][Math.floor(Math.random() * 3)]);
        }
        if (content.includes("{sender}")) {
          content = content.replace("{sender}", ["Marco Rossi", "Luca Bianchi", "Francesca Ricci"][Math.floor(Math.random() * 3)]);
        }
        if (content.includes("{date}")) {
          const futureDate = addDays(new Date(), Math.floor(Math.random() * 14) + 1);
          content = content.replace("{date}", format(futureDate, "dd/MM/yyyy"));
        }
        
        // Decide se la notifica è già stata letta
        const isRead = Math.random() > 0.3; // 70% chance di essere già letta
        
        // Crea un timestamp casuale tra 14 giorni fa e ora
        const daysAgo = Math.floor(Math.random() * 14);
        const timestamp = addDays(new Date(), -daysAgo);
        
        testNotifications.push({
          userId,
          title: notificationTitles[titleIndex],
          message: content,
          isRead,
          timestamp,
          link: i % 3 === 0 ? "/dashboard" : null // 1/3 delle notifiche ha un link
        });
      }
    }
    
    // Aggiungi alcune notifiche non lette recenti per testare la funzionalità
    for (let userId = 1; userId <= 5; userId++) { // Solo per i barbieri
      testNotifications.push({
        userId,
        title: "Nuovo appuntamento oggi",
        message: `Hai un nuovo appuntamento oggi alle ${["15:00", "16:30", "17:00"][Math.floor(Math.random() * 3)]}`,
        isRead: false,
        timestamp: new Date(), // Notifica di oggi
        link: "/dashboard"
      });
    }
    
    // Inseriamo tutte le notifiche nel DB
    for (const notification of testNotifications) {
      await db.insert(notifications).values(notification);
    }
    console.log(`✅ Create ${testNotifications.length} notifiche di test`);
    
    console.log('\nInformazioni di accesso:');
    console.log('- Admin: username = admin, password = password123');
    console.log('- Barbiere Manager: username = marco, password = password123, codice = MARCO123');
    console.log('- Barbiere Manager: username = luca, password = password123, codice = LUCA456');
    console.log('- Barbiere Giuseppe (non approvato): username = giuseppe, password = password123, codice = GIUSEP789');
    console.log('- Barbiera Francesca (dipendente di Marco): username = francesca, password = password123');
    console.log('- Barbiere Davide (dipendente di Luca): username = davide, password = password123');
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