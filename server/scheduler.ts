import { storage } from "./storage";
import { notificationService } from "./notification-service";
import { Appointment } from "@shared/schema";
import { addDays, addHours, isBefore, startOfDay } from "date-fns";

/**
 * Servizio per la pianificazione e gestione automatica dei promemoria per gli appuntamenti
 */
export class AppointmentScheduler {
  private readonly REMINDER_HOURS_BEFORE = 24; // Invia promemoria 24 ore prima
  private readonly SAME_DAY_REMINDER_HOURS_BEFORE = 2; // Invia promemoria 2 ore prima

  /**
   * Verifica gli appuntamenti futuri e invia promemoria per quelli imminenti
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      // Ottieni la data corrente
      const now = new Date();
      
      // Calcola il limite per i promemoria di 24 ore
      const reminderThreshold = addHours(now, this.REMINDER_HOURS_BEFORE);
      const startDate = startOfDay(now);
      const endDate = addDays(startDate, 7); // Controlla appuntamenti fino a 7 giorni in futuro
      
      // Ottieni tutti gli appuntamenti futuri confermati
      const appointments = await this.getConfirmedAppointments(startDate, endDate);
      
      // Processa ogni appuntamento
      for (const appointment of appointments) {
        const appointmentDate = new Date(appointment.date);
        
        // Calcola il limite per i promemoria del giorno stesso
        const sameDayReminderThreshold = addHours(now, this.SAME_DAY_REMINDER_HOURS_BEFORE);
        
        // Verifica se l'appuntamento rientra nel periodo del promemoria di 24 ore
        const isWithin24HourWindow = isBefore(appointmentDate, reminderThreshold) && 
                                     isBefore(now, appointmentDate);
                                     
        // Verifica se l'appuntamento rientra nel periodo del promemoria dello stesso giorno
        const isWithinSameDayWindow = isBefore(appointmentDate, sameDayReminderThreshold) && 
                                     isBefore(now, appointmentDate);
        
        if (isWithin24HourWindow) {
          await this.sendDayBeforeReminder(appointment);
        }
        
        if (isWithinSameDayWindow) {
          await this.sendSameDayReminder(appointment);
        }
      }
      
      console.log(`[${new Date().toISOString()}] Completato check reminders appuntamenti`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Errore durante l'invio dei promemoria:`, error);
    }
  }
  
  /**
   * Recupera gli appuntamenti confermati in un intervallo di date
   * @param startDate Data di inizio
   * @param endDate Data di fine
   * @returns Elenco di appuntamenti
   */
  private async getConfirmedAppointments(startDate: Date, endDate: Date): Promise<Appointment[]> {
    // Ottieni tutti gli appuntamenti nel periodo specificato
    const allAppointments = await storage.getAllAppointments();
    
    // Filtra per status=confirmed e nell'intervallo di date
    return allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointment.status === 'confirmed' && 
            appointmentDate >= startDate && 
            appointmentDate <= endDate;
    });
  }
  
  /**
   * Invia un promemoria per un appuntamento il giorno prima
   * @param appointment L'appuntamento per cui inviare il promemoria
   */
  private async sendDayBeforeReminder(appointment: Appointment): Promise<void> {
    // Controlla se abbiamo già inviato un promemoria per questo appuntamento
    const alreadySent = await this.checkReminderAlreadySent(appointment.id, 'appointment_reminder');
    if (alreadySent) return;
    
    // Invia il promemoria al cliente
    await notificationService.createAppointmentReminder(appointment.clientId, appointment);
    
    console.log(`Inviato promemoria giorno prima per appuntamento ID: ${appointment.id}`);
  }
  
  /**
   * Invia un promemoria per un appuntamento lo stesso giorno
   * @param appointment L'appuntamento per cui inviare il promemoria
   */
  private async sendSameDayReminder(appointment: Appointment): Promise<void> {
    // Controlla se abbiamo già inviato un promemoria dello stesso giorno per questo appuntamento
    const alreadySent = await this.checkReminderAlreadySent(appointment.id, 'appointment_reminder_same_day');
    if (alreadySent) return;
    
    // Invia il promemoria al cliente usando il servizio di notifica dedicato
    await notificationService.createSameDayAppointmentReminder(appointment.clientId, appointment);
    
    console.log(`Inviato promemoria stesso giorno per appuntamento ID: ${appointment.id}`);
  }
  
  /**
   * Verifica se è già stato inviato un promemoria per questo appuntamento
   * @param appointmentId ID dell'appuntamento
   * @param reminderType Tipo di promemoria
   * @returns true se il promemoria è già stato inviato
   */
  private async checkReminderAlreadySent(appointmentId: number, reminderType: string): Promise<boolean> {
    // Recupera tutte le notifiche 
    const allNotifications = await storage.getAllNotifications();
    
    // Filtra per trovare le notifiche che corrispondono al tipo e all'appuntamento
    return allNotifications.some(notification => 
      notification.type === reminderType && 
      notification.relatedId === appointmentId
    );
  }
}

export const appointmentScheduler = new AppointmentScheduler();