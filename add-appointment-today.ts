/**
 * Script per aggiungere appuntamenti alla data odierna
 */
import { db } from "./server/db";
import { appointments } from "./shared/schema";
import { eq } from "drizzle-orm";

const today = new Date();
today.setFullYear(2025); // Imposta l'anno a 2025 per matchare la data dell'applicazione
console.log(`Data utilizzata per gli appuntamenti: ${today.toISOString().split('T')[0]}`);

async function addAppointmentsToday() {
  try {
    console.log("Aggiunta di appuntamenti per la data odierna...");
    
    // Definizione degli orari per gli appuntamenti
    const hours = [9, 10, 12, 14, 16, 17];
    
    // Barber ID di Marco (2) e Client ID di Andrea (7)
    const barberId = 2;
    const clientId = 7;
    const serviceIds = [1, 2, 3, 4]; // IDs dei servizi
    
    // Crea 4 appuntamenti per oggi
    for (let i = 0; i < 4; i++) {
      const hour = hours[i];
      const minute = i % 2 === 0 ? 0 : 30;
      
      const appointmentDate = new Date(today);
      appointmentDate.setHours(hour, minute, 0, 0);
      
      // Se l'ora è già passata, mark come completato, altrimenti confermato
      const status = appointmentDate < new Date() ? 'completed' : 'confirmed';
      
      const appointment = {
        date: appointmentDate,
        clientId,
        barberId,
        serviceId: serviceIds[i % serviceIds.length],
        status,
        notes: i === 2 ? 'Appuntamento con note speciali per test' : null,
        walkIn: i === 3 // Solo l'ultimo è walk-in
      };
      
      // Inserisci l'appuntamento
      await db.insert(appointments).values(appointment);
      console.log(`Creato appuntamento per oggi alle ${hour}:${minute === 0 ? '00' : minute}, stato: ${status}`);
    }
    
    console.log("✅ Appuntamenti per oggi aggiunti con successo!");
  } catch (error) {
    console.error("❌ Errore durante l'aggiunta degli appuntamenti:", error);
  } finally {
    process.exit(0);
  }
}

// Esegui lo script
addAppointmentsToday();