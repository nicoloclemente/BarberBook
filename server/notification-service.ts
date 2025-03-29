import { storage } from "./storage";
import { Appointment, InsertNotification, NotificationType, User, Message } from "@shared/schema";

/**
 * Servizio per la gestione delle notifiche interne all'applicazione.
 * Questo servizio è un'alternativa all'uso di API esterne come Twilio o SendGrid.
 */
export class NotificationService {
  /**
   * Crea una notifica per un promemoria di appuntamento
   * @param userId ID dell'utente destinatario
   * @param appointment L'appuntamento per cui creare il promemoria
   */
  async createAppointmentReminder(userId: number, appointment: Appointment): Promise<void> {
    // Determina l'orario dell'appuntamento
    const appointmentDate = new Date(appointment.date);
    const timeString = appointmentDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateString = appointmentDate.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
    
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: "Promemoria Appuntamento",
      message: `Hai un appuntamento programmato per il ${dateString} alle ${timeString}.`,
      isRead: false,
      relatedId: appointment.id
    };
    
    await storage.createNotification(notification);
  }
  
  /**
   * Crea una notifica per un promemoria di appuntamento nello stesso giorno
   * @param userId ID dell'utente destinatario
   * @param appointment L'appuntamento per cui creare il promemoria
   */
  async createSameDayAppointmentReminder(userId: number, appointment: Appointment): Promise<void> {
    // Determina l'orario dell'appuntamento
    const appointmentDate = new Date(appointment.date);
    const timeString = appointmentDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.APPOINTMENT_REMINDER_SAME_DAY,
      title: "Promemoria Appuntamento Oggi",
      message: `Ricorda: hai un appuntamento oggi alle ${timeString}. Ti aspettiamo!`,
      isRead: false,
      relatedId: appointment.id
    };
    
    await storage.createNotification(notification);
  }
  
  /**
   * Crea una notifica per la conferma di un appuntamento
   * @param userId ID dell'utente destinatario
   * @param appointment L'appuntamento confermato
   */
  async createAppointmentConfirmation(userId: number, appointment: Appointment): Promise<void> {
    // Determina l'orario dell'appuntamento
    const appointmentDate = new Date(appointment.date);
    const timeString = appointmentDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateString = appointmentDate.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
    
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.APPOINTMENT_CONFIRMATION,
      title: "Appuntamento Confermato",
      message: `Il tuo appuntamento per il ${dateString} alle ${timeString} è stato confermato.`,
      isRead: false,
      relatedId: appointment.id
    };
    
    await storage.createNotification(notification);
  }
  
  /**
   * Crea una notifica per la cancellazione di un appuntamento
   * @param userId ID dell'utente destinatario
   * @param appointment L'appuntamento cancellato
   */
  async createAppointmentCancellation(userId: number, appointment: Appointment): Promise<void> {
    // Determina l'orario dell'appuntamento
    const appointmentDate = new Date(appointment.date);
    const timeString = appointmentDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateString = appointmentDate.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
    
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.APPOINTMENT_CANCELLED,
      title: "Appuntamento Cancellato",
      message: `L'appuntamento programmato per il ${dateString} alle ${timeString} è stato cancellato.`,
      isRead: false,
      relatedId: appointment.id
    };
    
    await storage.createNotification(notification);
  }
  
  /**
   * Crea una notifica per la modifica di un appuntamento
   * @param userId ID dell'utente destinatario
   * @param appointment L'appuntamento modificato
   */
  async createAppointmentModification(userId: number, appointment: Appointment): Promise<void> {
    // Determina l'orario dell'appuntamento
    const appointmentDate = new Date(appointment.date);
    const timeString = appointmentDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateString = appointmentDate.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
    
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.APPOINTMENT_MODIFIED,
      title: "Appuntamento Modificato",
      message: `Il tuo appuntamento è stato modificato. La nuova data è ${dateString} alle ${timeString}.`,
      isRead: false,
      relatedId: appointment.id
    };
    
    await storage.createNotification(notification);
  }
  
  /**
   * Crea una notifica per un nuovo messaggio ricevuto
   * @param userId ID dell'utente destinatario
   * @param sender L'utente che ha inviato il messaggio
   * @param messageId ID del messaggio
   */
  async createNewMessageNotification(userId: number, sender: User, messageId: number): Promise<void> {
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.NEW_MESSAGE,
      title: "Nuovo Messaggio",
      message: `Hai ricevuto un nuovo messaggio da ${sender.name}.`,
      isRead: false,
      relatedId: messageId
    };
    
    await storage.createNotification(notification);
  }
  
  /**
   * Crea una notifica di sistema
   * @param userId ID dell'utente destinatario
   * @param title Titolo della notifica
   * @param message Contenuto della notifica
   */
  async createSystemNotification(userId: number, title: string, message: string): Promise<void> {
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.SYSTEM,
      title,
      message,
      isRead: false
    };
    
    await storage.createNotification(notification);
  }
  
  /**
   * Crea una notifica per una nuova richiesta di appuntamento
   * @param userId ID dell'utente destinatario (barbiere)
   * @param appointment L'appuntamento richiesto
   * @param clientName Nome del cliente che ha effettuato la richiesta
   */
  async createAppointmentRequestNotification(userId: number, appointment: Appointment, clientName: string): Promise<void> {
    // Determina l'orario dell'appuntamento
    const appointmentDate = new Date(appointment.date);
    const timeString = appointmentDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateString = appointmentDate.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
    
    // Crea la notifica
    const notification: InsertNotification = {
      userId,
      type: NotificationType.APPOINTMENT_REQUEST,
      title: "Nuova Richiesta di Appuntamento",
      message: `${clientName} ha richiesto un appuntamento per il ${dateString} alle ${timeString}.`,
      isRead: false,
      relatedId: appointment.id
    };
    
    await storage.createNotification(notification);
  }
}

// Esporta un'istanza del servizio
export const notificationService = new NotificationService();