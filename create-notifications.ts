/**
 * Script per creare notifiche di test per l'applicazione Barber Shop
 */
import { db } from './server/db';
import { notifications, NotificationType } from './shared/schema';
import { addDays, format } from 'date-fns';

async function createTestNotifications() {
  try {
    console.log('Creazione notifiche di test...');
    
    // Creiamo almeno una notifica per gli utenti principali
    // ID ottenuti dalla console quando abbiamo eseguito create-test-users.ts
    const adminId = 56;
    const marcoId = 57;
    const lucaId = 58;
    const andreaId = 62;
    const paoloId = 63;
    
    const barberIds = [marcoId, lucaId];
    const clientIds = [andreaId, paoloId];
    
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
    
    // Crea solo poche notifiche per velocizzare l'esecuzione
    const selectedUserIds = [adminId, ...barberIds, ...clientIds];
    
    for (const userId of selectedUserIds) {
      // Solo 1 notifica per utente
      const titleIndex = Math.floor(Math.random() * notificationTitles.length);
      let content = notificationContents[titleIndex];
      
      // Sostituisci i placeholder con valori plausibili
      if (content.includes("{time}")) {
        content = content.replace("{time}", ["9:00", "10:30", "14:00", "16:30"][Math.floor(Math.random() * 4)]);
      }
      if (content.includes("{client}")) {
        content = content.replace("{client}", ["Andrea Ferrari", "Paolo Neri"][Math.floor(Math.random() * 2)]);
      }
      if (content.includes("{sender}")) {
        content = content.replace("{sender}", ["Marco Rossi", "Luca Bianchi"][Math.floor(Math.random() * 2)]);
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
      
      // Assegna un tipo di notifica appropriato
      let notificationType = NotificationType.SYSTEM; // default
      if (titleIndex === 0) notificationType = NotificationType.APPOINTMENT_CONFIRMATION;
      if (titleIndex === 1) notificationType = NotificationType.APPOINTMENT_REMINDER;
      if (titleIndex === 2) notificationType = NotificationType.APPOINTMENT_CANCELLED;
      if (titleIndex === 3) notificationType = NotificationType.APPOINTMENT_REQUEST;
      if (titleIndex === 5) notificationType = NotificationType.NEW_MESSAGE;
      
      testNotifications.push({
        userId,
        type: notificationType,
        title: notificationTitles[titleIndex],
        message: content,
        isRead,
        timestamp,
        relatedId: null,
      });
    }
    
    // Aggiungi alcune notifiche non lette recenti per testare la funzionalità
    // Solo per i barbieri
    for (const barberId of barberIds) {
      testNotifications.push({
        userId: barberId,
        type: NotificationType.APPOINTMENT_REQUEST,
        title: "Nuovo appuntamento oggi",
        message: `Hai un nuovo appuntamento oggi alle ${["15:00", "16:30", "17:00"][Math.floor(Math.random() * 3)]}`,
        isRead: false,
        timestamp: new Date(), // Notifica di oggi
        relatedId: null,
      });
    }
    
    // Inseriamo tutte le notifiche nel DB
    for (const notification of testNotifications) {
      await db.insert(notifications).values(notification);
    }
    console.log(`✅ Create ${testNotifications.length} notifiche di test`);
    
  } catch (error) {
    console.error('❌ Errore durante la creazione delle notifiche di test:', error);
  }
}

createTestNotifications()
  .then(() => {
    console.log('✨ Completato!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Errore:', err);
    process.exit(1);
  });