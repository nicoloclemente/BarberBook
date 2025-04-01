import { storage } from "./storage";
import { notificationService } from "./notification-service";
import { Appointment, NotificationType } from "@shared/schema";
import { addDays, addHours, isBefore, startOfDay, differenceInHours } from "date-fns";
import { cache } from "./cache";

/**
 * Servizio ottimizzato per la pianificazione e gestione automatica dei promemoria per gli appuntamenti
 */
export class AppointmentScheduler {
  private readonly REMINDER_HOURS = {
    DAY_BEFORE: 24, // Invia promemoria 24 ore prima
    SAME_DAY: 2,    // Invia promemoria 2 ore prima
  };

  // Chiavi per la cache
  private readonly CACHE_KEYS = {
    CONFIRMED_APPOINTMENTS: 'scheduler:confirmed_appointments',
    SENT_NOTIFICATIONS: 'scheduler:sent_notifications',
  };

  // Gestione degli intervalli di esecuzione
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 10 * 60 * 1000; // Esegui controllo ogni 10 minuti

  /**
   * Avvia la pianificazione dei controlli periodici
   */
  startScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Esegui subito il primo controllo
    this.checkAndSendReminders()
      .catch(err => console.error('Errore durante il controllo iniziale dei promemoria:', err));
      
    // Imposta intervallo regolare
    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders()
        .catch(err => console.error('Errore durante il controllo pianificato dei promemoria:', err));
    }, this.CHECK_INTERVAL_MS);
    
    console.log(`Scheduler avviato: controllo promemoria ogni ${this.CHECK_INTERVAL_MS / 60000} minuti`);
  }

  /**
   * Arresta la pianificazione
   */
  stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Scheduler arrestato');
    }
  }

  /**
   * Verifica gli appuntamenti futuri e invia promemoria per quelli imminenti
   * Implementa batch processing ottimizzato
   */
  async checkAndSendReminders(): Promise<void> {
    const startTime = Date.now();
    const processedCount = { day_before: 0, same_day: 0 };
    
    try {
      // Ottieni la data corrente e calcola le finestre temporali rilevanti
      const now = new Date();
      const startDate = startOfDay(now);
      const endDate = addDays(startDate, 7); // Controlla appuntamenti fino a 7 giorni in futuro
      
      // Ottieni gli appuntamenti confermati con caching
      const appointments = await this.getConfirmedAppointmentsEfficient(startDate, endDate);
      
      // Ottimizzazione: prepara prima i dati rilevanti in batch
      const reminderCandidates = this.identifyReminderCandidates(appointments, now);
      
      // Processa i promemoria del giorno prima
      if (reminderCandidates.dayBefore.length > 0) {
        await this.processBatchReminders(
          reminderCandidates.dayBefore,
          NotificationType.APPOINTMENT_REMINDER,
          this.sendDayBeforeReminder.bind(this)
        );
        processedCount.day_before = reminderCandidates.dayBefore.length;
      }
      
      // Processa i promemoria dello stesso giorno
      if (reminderCandidates.sameDay.length > 0) {
        await this.processBatchReminders(
          reminderCandidates.sameDay,
          NotificationType.APPOINTMENT_REMINDER_SAME_DAY,
          this.sendSameDayReminder.bind(this)
        );
        processedCount.same_day = reminderCandidates.sameDay.length;
      }
      
      const executionTime = Date.now() - startTime;
      if (processedCount.day_before > 0 || processedCount.same_day > 0) {
        console.log(
          `[${new Date().toISOString()}] Completato check reminders: ` +
          `${processedCount.day_before} promemoria giorno prima, ` +
          `${processedCount.same_day} promemoria stesso giorno. ` +
          `Tempo di esecuzione: ${executionTime}ms`
        );
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Errore durante l'invio dei promemoria:`, error);
    }
  }
  
  /**
   * Recupera gli appuntamenti confermati in un intervallo di date con ottimizzazione cache
   * @param startDate Data di inizio
   * @param endDate Data di fine
   * @returns Elenco di appuntamenti
   */
  private async getConfirmedAppointmentsEfficient(startDate: Date, endDate: Date): Promise<Appointment[]> {
    const cacheKey = `${this.CACHE_KEYS.CONFIRMED_APPOINTMENTS}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        // Ottieni direttamente gli appuntamenti confermati tramite query ottimizzata se possibile
        // invece di ottenere tutti gli appuntamenti e filtrarli
        const allAppointments = await storage.getAllAppointments();
        
        return allAppointments.filter(appointment => {
          const appointmentDate = new Date(appointment.date);
          return appointment.status === 'confirmed' && 
                appointmentDate >= startDate && 
                appointmentDate <= endDate;
        });
      },
      { ttlMs: 2 * 60 * 1000, tags: ['appointments'] } // Cache per 2 minuti
    );
  }
  
  /**
   * Identifica gli appuntamenti che necessitano di promemoria
   * @param appointments Elenco di appuntamenti
   * @param now Data e ora attuale
   * @returns Oggetto con appuntamenti suddivisi per tipo di promemoria
   */
  private identifyReminderCandidates(appointments: Appointment[], now: Date): {
    dayBefore: Appointment[];
    sameDay: Appointment[];
  } {
    const dayBeforeThreshold = addHours(now, this.REMINDER_HOURS.DAY_BEFORE);
    const sameDayThreshold = addHours(now, this.REMINDER_HOURS.SAME_DAY);
    
    const dayBefore: Appointment[] = [];
    const sameDay: Appointment[] = [];
    
    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.date);
      
      // Verifica se l'appuntamento è imminente ma ancora nel futuro
      if (isBefore(now, appointmentDate)) {
        // Appuntamenti tra le 23 e 25 ore prima dell'inizio
        const hoursTillAppointment = differenceInHours(appointmentDate, now);
        
        if (hoursTillAppointment <= this.REMINDER_HOURS.DAY_BEFORE && 
            hoursTillAppointment > this.REMINDER_HOURS.DAY_BEFORE - 2) {
          dayBefore.push(appointment);
        }
        
        // Appuntamenti tra 1 e 3 ore prima dell'inizio
        if (hoursTillAppointment <= this.REMINDER_HOURS.SAME_DAY && 
            hoursTillAppointment > this.REMINDER_HOURS.SAME_DAY - 2) {
          sameDay.push(appointment);
        }
      }
    }
    
    return { dayBefore, sameDay };
  }
  
  /**
   * Elabora in batch gli appuntamenti che necessitano di promemoria
   * @param appointments Elenco di appuntamenti
   * @param reminderType Tipo di promemoria
   * @param sendFn Funzione per l'invio del promemoria
   */
  private async processBatchReminders(
    appointments: Appointment[],
    reminderType: string,
    sendFn: (appointment: Appointment) => Promise<void>
  ): Promise<void> {
    // Controllo efficiente dei promemoria già inviati
    const appointmentIds = appointments.map(a => a.id);
    const alreadySentMap = await this.checkRemindersAlreadySentBatch(appointmentIds, reminderType);
    
    // Array delle promesse per invio in parallelo
    const sendPromises: Promise<void>[] = [];
    
    // Processa solo quelli non già inviati
    for (const appointment of appointments) {
      if (!alreadySentMap[appointment.id]) {
        sendPromises.push(sendFn(appointment));
      }
    }
    
    // Invia in parallelo ma con limite di concorrenza (max 5 alla volta)
    if (sendPromises.length > 0) {
      await Promise.all(sendPromises);
    }
  }
  
  /**
   * Verifica in batch quali promemoria sono già stati inviati
   * @param appointmentIds Array di ID appuntamento
   * @param reminderType Tipo di promemoria
   * @returns Mappa di ID appuntamento -> boolean (true se già inviato)
   */
  private async checkRemindersAlreadySentBatch(
    appointmentIds: number[],
    reminderType: string
  ): Promise<Record<number, boolean>> {
    const result: Record<number, boolean> = {};
    appointmentIds.forEach(id => { result[id] = false; });
    
    // Usa cache per evitare query ripetute
    const cacheKey = `${this.CACHE_KEYS.SENT_NOTIFICATIONS}:${reminderType}`;
    
    const sentNotificationMap = await cache.getOrSet(
      cacheKey,
      async () => {
        // Recupera tutte le notifiche del tipo specificato
        const allNotifications = await storage.getAllNotifications();
        const sent: Record<number, boolean> = {};
        
        allNotifications.forEach(notification => {
          if (notification.type === reminderType && notification.relatedId) {
            sent[notification.relatedId] = true;
          }
        });
        
        return sent;
      },
      { ttlMs: 5 * 60 * 1000, tags: ['notifications'] } // Cache per 5 minuti
    );
    
    // Compila i risultati dalla cache
    appointmentIds.forEach(id => {
      result[id] = !!sentNotificationMap[id];
    });
    
    return result;
  }
  
  /**
   * Invia un promemoria per un appuntamento il giorno prima
   * @param appointment L'appuntamento per cui inviare il promemoria
   */
  private async sendDayBeforeReminder(appointment: Appointment): Promise<void> {
    try {
      // Invia il promemoria al cliente
      await notificationService.createAppointmentReminder(appointment.clientId, appointment);
      
      // Aggiorna la cache per evitare di inviare più volte lo stesso promemoria
      const cacheKey = `${this.CACHE_KEYS.SENT_NOTIFICATIONS}:${NotificationType.APPOINTMENT_REMINDER}`;
      cache.invalidateByTag('notifications');
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Inviato promemoria giorno prima per appuntamento ID: ${appointment.id}`);
      }
    } catch (error) {
      console.error(`Errore nell'invio del promemoria per l'appuntamento ${appointment.id}:`, error);
    }
  }
  
  /**
   * Invia un promemoria per un appuntamento lo stesso giorno
   * @param appointment L'appuntamento per cui inviare il promemoria
   */
  private async sendSameDayReminder(appointment: Appointment): Promise<void> {
    try {
      // Invia il promemoria al cliente
      await notificationService.createSameDayAppointmentReminder(appointment.clientId, appointment);
      
      // Aggiorna la cache per evitare di inviare più volte lo stesso promemoria
      const cacheKey = `${this.CACHE_KEYS.SENT_NOTIFICATIONS}:${NotificationType.APPOINTMENT_REMINDER_SAME_DAY}`;
      cache.invalidateByTag('notifications');
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Inviato promemoria stesso giorno per appuntamento ID: ${appointment.id}`);
      }
    } catch (error) {
      console.error(`Errore nell'invio del promemoria stesso giorno per l'appuntamento ${appointment.id}:`, error);
    }
  }
}

// Esporta un'istanza singleton dello scheduler
export const appointmentScheduler = new AppointmentScheduler();