import { 
  users, type User, type InsertUser,
  services, type Service, type InsertService,
  appointments, type Appointment, type InsertAppointment,
  messages, type Message, type InsertMessage,
  statistics, type Statistics, type InsertStatistics,
  reviews, type Review, type InsertReview,
  notifications, type Notification, type InsertNotification,
  type AppointmentWithDetails,
  type MessageWithSender,
  type StatisticsWithBarber,
  type ReviewWithDetails,
  UserRole
} from "@shared/schema";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { db, pool } from "./db";
import { eq, and, or, between, desc, sql, asc, isNull, lt, gt } from "drizzle-orm";
import { cache } from "./cache";

export interface IStorage {
  // User related operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllBarbers(): Promise<User[]>;
  getAllClients(): Promise<User[]>;
  getClientsByBarberCode(barberCode: string): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  approveBarber(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Service related operations
  getService(id: number): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Appointment related operations
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentWithDetails(id: number): Promise<AppointmentWithDetails | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByBarber(barberId: number): Promise<AppointmentWithDetails[]>;
  getAppointmentsByClient(clientId: number): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDate(barberId: number, date: Date): Promise<AppointmentWithDetails[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
  // Message related operations
  getMessage(id: number): Promise<Message | undefined>;
  getAllMessages(): Promise<Message[]>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<MessageWithSender[]>;
  getUnreadMessageCount(userId: number): Promise<Record<number, number>>;
  getRecentChats(userId: number): Promise<{userId: number, user: User, lastMessage: Message, unreadCount: number}[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(senderId: number, receiverId: number): Promise<boolean>;

  // Statistics related operations
  getBarberStatistics(barberId: number, period?: { start: Date, end: Date }): Promise<Statistics[]>;
  createOrUpdateDailyStatistics(barberId: number, date: Date, data: Partial<InsertStatistics>): Promise<Statistics>;
  
  // Review related operations
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByBarber(barberId: number): Promise<ReviewWithDetails[]>;
  getReviewsByClient(clientId: number): Promise<ReviewWithDetails[]>;
  
  // Notification related operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getAllNotifications(): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<number, Service>;
  private appointments: Map<number, Appointment>;
  private messages: Map<number, Message>;
  private notifications: Map<number, Notification>;
  private userIdCounter: number;
  private serviceIdCounter: number;
  private appointmentIdCounter: number;
  private messageIdCounter: number;
  private notificationIdCounter: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.appointments = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    this.userIdCounter = 1;
    this.serviceIdCounter = 1;
    this.appointmentIdCounter = 1;
    this.messageIdCounter = 1;
    this.notificationIdCounter = 1;

    // Initialize session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });

    // Add some default services
    this.createService({
      name: "Taglio Capelli",
      description: "Taglio classico con forbici e rifinitura con rasoio.",
      price: 2000, // €20.00
      duration: 30, // 30 minutes
      imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8aGFpcmN1dHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60"
    });
    
    this.createService({
      name: "Barba Completa",
      description: "Rasatura completa con trattamento pre e post-barba.",
      price: 1500, // €15.00
      duration: 20, // 20 minutes
      imageUrl: "https://images.unsplash.com/photo-1621607512214-68297480165e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8YmVhcmQlMjB0cmltfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60"
    });
    
    this.createService({
      name: "Taglio + Barba",
      description: "Servizio completo di taglio capelli e sistemazione barba.",
      price: 3500, // €35.00
      duration: 45, // 45 minutes
      imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8OHx8aGFpcmN1dCUyMGFuZCUyMGJlYXJkfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60"
    });
    
    this.createService({
      name: "Shampoo + Taglio",
      description: "Shampoo professionale e taglio personalizzato.",
      price: 2500, // €25.00
      duration: 35, // 35 minutes
      imageUrl: "https://images.unsplash.com/photo-1634302066072-dcdb3244782c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8aGFpcmN1dCUyMHNoYW1wb298ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60"
    });
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllBarbers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isBarber);
  }

  async getAllClients(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => !user.isBarber);
  }
  
  async getClientsByBarberCode(barberCode: string): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => !user.isBarber && user.barberCode === barberCode);
  }

  // Service related methods
  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = this.serviceIdCounter++;
    const service: Service = { ...insertService, id };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: number, serviceUpdate: Partial<InsertService>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updatedService = { ...service, ...serviceUpdate };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  // Appointment related methods
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentWithDetails(id: number): Promise<AppointmentWithDetails | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    
    const client = await this.getUser(appointment.clientId);
    const service = await this.getService(appointment.serviceId);
    
    if (!client || !service) return undefined;
    
    return {
      ...appointment,
      client,
      service
    };
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointmentsByBarber(barberId: number): Promise<AppointmentWithDetails[]> {
    const barberAppointments = Array.from(this.appointments.values())
      .filter(appointment => appointment.barberId === barberId);
    
    const appointmentsWithDetails: AppointmentWithDetails[] = [];
    
    for (const appointment of barberAppointments) {
      const client = await this.getUser(appointment.clientId);
      const service = await this.getService(appointment.serviceId);
      
      if (client && service) {
        appointmentsWithDetails.push({
          ...appointment,
          client,
          service
        });
      }
    }
    
    return appointmentsWithDetails;
  }

  async getAppointmentsByClient(clientId: number): Promise<AppointmentWithDetails[]> {
    const clientAppointments = Array.from(this.appointments.values())
      .filter(appointment => appointment.clientId === clientId);
    
    const appointmentsWithDetails: AppointmentWithDetails[] = [];
    
    for (const appointment of clientAppointments) {
      const client = await this.getUser(appointment.clientId);
      const service = await this.getService(appointment.serviceId);
      
      if (client && service) {
        appointmentsWithDetails.push({
          ...appointment,
          client,
          service
        });
      }
    }
    
    return appointmentsWithDetails;
  }

  async getAppointmentsByDate(barberId: number, date: Date): Promise<AppointmentWithDetails[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const appointmentsForDay = Array.from(this.appointments.values())
      .filter(appointment => 
        appointment.barberId === barberId &&
        new Date(appointment.date) >= startOfDay &&
        new Date(appointment.date) <= endOfDay
      );
    
    const appointmentsWithDetails: AppointmentWithDetails[] = [];
    
    for (const appointment of appointmentsForDay) {
      const client = await this.getUser(appointment.clientId);
      const service = await this.getService(appointment.serviceId);
      
      if (client && service) {
        appointmentsWithDetails.push({
          ...appointment,
          client,
          service
        });
      }
    }
    
    return appointmentsWithDetails;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentIdCounter++;
    const appointment: Appointment = { ...insertAppointment, id };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointment(id: number, appointmentUpdate: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    
    const updatedAppointment = { ...appointment, ...appointmentUpdate };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }

  // Message related methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getAllMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<MessageWithSender[]> {
    const messagesArray = Array.from(this.messages.values())
      .filter(message => 
        (message.senderId === user1Id && message.receiverId === user2Id) ||
        (message.senderId === user2Id && message.receiverId === user1Id)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const messagesWithSender: MessageWithSender[] = [];
    
    for (const message of messagesArray) {
      const sender = await this.getUser(message.senderId);
      
      if (sender) {
        messagesWithSender.push({
          ...message,
          sender
        });
      }
    }
    
    return messagesWithSender;
  }

  async getUnreadMessageCount(userId: number): Promise<Record<number, number>> {
    const unreadCounts: Record<number, number> = {};
    
    Array.from(this.messages.values())
      .filter(message => message.receiverId === userId && !message.isRead)
      .forEach(message => {
        unreadCounts[message.senderId] = (unreadCounts[message.senderId] || 0) + 1;
      });
    
    return unreadCounts;
  }

  async getRecentChats(userId: number): Promise<{userId: number, user: User, lastMessage: Message, unreadCount: number}[]> {
    // Find all users this user has chatted with
    const chatPartnerIds = new Set<number>();
    
    Array.from(this.messages.values())
      .filter(message => message.senderId === userId || message.receiverId === userId)
      .forEach(message => {
        const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
        chatPartnerIds.add(partnerId);
      });
    
    const recentChats = [];
    const unreadCounts = await this.getUnreadMessageCount(userId);
    
    for (const partnerId of chatPartnerIds) {
      const partner = await this.getUser(partnerId);
      if (!partner) continue;
      
      // Get most recent message
      const messages = await this.getMessagesBetweenUsers(userId, partnerId);
      if (messages.length === 0) continue;
      
      const lastMessage = messages[messages.length - 1];
      const unreadCount = unreadCounts[partnerId] || 0;
      
      recentChats.push({
        userId: partnerId,
        user: partner,
        lastMessage,
        unreadCount
      });
    }
    
    // Sort by most recent message
    recentChats.sort((a, b) => 
      new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );
    
    return recentChats;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      timestamp: new Date(),
      isRead: false
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<boolean> {
    let updated = false;
    
    Array.from(this.messages.values())
      .filter(message => message.senderId === senderId && message.receiverId === receiverId && !message.isRead)
      .forEach(message => {
        message.isRead = true;
        this.messages.set(message.id, message);
        updated = true;
      });
    
    return updated;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Elimina tutti gli appuntamenti del cliente o del barbiere
    Array.from(this.appointments.values())
      .filter(appointment => appointment.clientId === id || appointment.barberId === id)
      .forEach(appointment => this.appointments.delete(appointment.id));
    
    // Elimina tutti i messaggi inviati o ricevuti dall'utente
    Array.from(this.messages.values())
      .filter(message => message.senderId === id || message.receiverId === id)
      .forEach(message => this.messages.delete(message.id));
    
    // Elimina tutte le notifiche dell'utente
    Array.from(this.notifications.values())
      .filter(notification => notification.userId === id)
      .forEach(notification => this.notifications.delete(notification.id));
    
    // Infine elimina l'utente
    return this.users.delete(id);
  }
  
  // Notification related methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }
  
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getAllNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .length;
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    let updated = false;
    
    Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .forEach(notification => {
        notification.isRead = true;
        this.notifications.set(notification.id, notification);
        updated = true;
      });
    
    return updated;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Creiamo uno store di sessione PostgreSQL
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    // Utilizziamo la cache per l'utente, valida per 5 minuti
    const cacheKey = `user:${id}`;
    return cache.getOrSet(cacheKey, async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }, 5 * 60 * 1000); // 5 minuti
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Utilizziamo la cache per gli utenti cercati per username
    const cacheKey = `user:username:${username}`;
    return cache.getOrSet(cacheKey, async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    }, 5 * 60 * 1000); // 5 minuti
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Assicuriamoci che il ruolo e isBarber siano consistenti
    let userToInsert = { ...insertUser };
    
    if (userToInsert.role === UserRole.BARBER) {
      userToInsert.isBarber = true;
    } else if (userToInsert.role === UserRole.CLIENT) {
      userToInsert.isBarber = false;
    }
    
    const [user] = await db.insert(users).values(userToInsert).returning();
    
    // Invalidiamo la cache relativa ai barbieri o clienti
    cache.delete('users:barbers');
    cache.delete('users:clients');
    
    return user;
  }

  async getAllBarbers(): Promise<User[]> {
    // Memorizziamo la lista dei barbieri in cache per 10 minuti
    return cache.getOrSet('users:barbers', async () => {
      return db.select().from(users).where(
        and(
          eq(users.isActive, true),
          or(
            eq(users.isBarber, true),
            eq(users.role, UserRole.BARBER)
          )
        )
      );
    }, 10 * 60 * 1000); // 10 minuti
  }

  async getAllClients(): Promise<User[]> {
    // Memorizziamo la lista dei clienti in cache per 10 minuti
    return cache.getOrSet('users:clients', async () => {
      return db.select().from(users).where(
        and(
          eq(users.isActive, true),
          or(
            eq(users.isBarber, false),
            eq(users.role, UserRole.CLIENT)
          )
        )
      );
    }, 10 * 60 * 1000); // 10 minuti
  }
  
  async getClientsByBarberCode(barberCode: string): Promise<User[]> {
    // Memorizziamo la lista dei clienti per barber code in cache per 5 minuti
    return cache.getOrSet(`users:clients:barberCode:${barberCode}`, async () => {
      return db.select().from(users).where(
        and(
          eq(users.isActive, true),
          or(
            eq(users.isBarber, false),
            eq(users.role, UserRole.CLIENT)
          ),
          eq(users.barberCode, barberCode)
        )
      );
    }, 5 * 60 * 1000); // 5 minuti
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    // Memorizziamo la lista degli utenti per ruolo in cache per 10 minuti
    return cache.getOrSet(`users:role:${role}`, async () => {
      return db.select().from(users).where(
        and(
          eq(users.isActive, true),
          eq(users.role, role)
        )
      );
    }, 10 * 60 * 1000); // 10 minuti
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // Se stiamo aggiornando il barberCode, dobbiamo invalidare la cache dei clienti per quel barberCode
    let oldBarberCode: string | null = null;
    if (userData.barberCode !== undefined) {
      const [existingUser] = await db.select().from(users).where(eq(users.id, id));
      if (existingUser) {
        oldBarberCode = existingUser.barberCode;
      }
    }
    
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (user) {
      // Invalidiamo le cache relative all'utente
      cache.delete(`user:${id}`);
      cache.delete(`user:username:${user.username}`);
      cache.delete('users:barbers');
      cache.delete('users:clients');
      cache.delete(`users:role:${user.role}`);
      
      // Se è stato aggiornato il barberCode, invalidiamo anche la cache dei clienti con quel barberCode
      if (userData.barberCode !== undefined) {
        if (oldBarberCode) {
          cache.delete(`users:clients:barberCode:${oldBarberCode}`);
        }
        if (userData.barberCode) {
          cache.delete(`users:clients:barberCode:${userData.barberCode}`);
        }
      }
    }
    
    return user;
  }
  
  async approveBarber(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isApproved: true })
      .where(eq(users.id, id))
      .returning();
    
    if (user) {
      // Invalidiamo le cache relative all'utente
      cache.delete(`user:${id}`);
      cache.delete(`user:username:${user.username}`);
      cache.delete('users:barbers');
      cache.delete(`users:role:${UserRole.BARBER}`);
    }
    
    return user;
  }
  
  async removeBarberApproval(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isApproved: false })
      .where(eq(users.id, id))
      .returning();
    
    if (user) {
      // Invalidiamo le cache relative all'utente
      cache.delete(`user:${id}`);
      cache.delete(`user:username:${user.username}`);
      cache.delete('users:barbers');
      cache.delete(`users:role:${UserRole.BARBER}`);
    }
    
    return user;
  }

  // Service related methods
  async getService(id: number): Promise<Service | undefined> {
    // Utilizziamo la cache per il servizio, valida per 30 minuti
    const cacheKey = `service:${id}`;
    return cache.getOrSet(cacheKey, async () => {
      const [service] = await db.select().from(services).where(eq(services.id, id));
      return service;
    }, 30 * 60 * 1000); // 30 minuti
  }

  async getAllServices(): Promise<Service[]> {
    // Memorizziamo la lista dei servizi in cache per 30 minuti
    return cache.getOrSet('services:all', async () => {
      return db.select().from(services);
    }, 30 * 60 * 1000); // 30 minuti
  }

  async createService(service: InsertService): Promise<Service> {
    const [createdService] = await db.insert(services).values(service).returning();
    
    // Invalidiamo la cache dei servizi
    cache.delete('services:all');
    
    return createdService;
  }

  async updateService(id: number, serviceUpdate: Partial<InsertService>): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set(serviceUpdate)
      .where(eq(services.id, id))
      .returning();
    
    // Invalidiamo le cache
    if (service) {
      cache.delete(`service:${id}`);
      cache.delete('services:all');
    }
    
    return service;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    
    // Invalidiamo le cache
    if (result.count > 0) {
      cache.delete(`service:${id}`);
      cache.delete('services:all');
    }
    
    return result.count > 0;
  }

  // Appointment related methods
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAppointmentWithDetails(id: number): Promise<AppointmentWithDetails | undefined> {
    const result = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: {
        client: true,
        barber: true,
        service: true,
      },
    });
    
    return result;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return db.select().from(appointments);
  }

  async getAppointmentsByBarber(barberId: number): Promise<AppointmentWithDetails[]> {
    return db.query.appointments.findMany({
      where: eq(appointments.barberId, barberId),
      with: {
        client: true,
        barber: true,
        service: true,
      },
      orderBy: [desc(appointments.date)],
    });
  }

  async getAppointmentsByClient(clientId: number): Promise<AppointmentWithDetails[]> {
    return db.query.appointments.findMany({
      where: eq(appointments.clientId, clientId),
      with: {
        client: true,
        barber: true,
        service: true,
      },
      orderBy: [desc(appointments.date)],
    });
  }

  async getAppointmentsByDate(barberId: number, date: Date): Promise<AppointmentWithDetails[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Memorizziamo gli appuntamenti giornalieri in cache per 5 minuti
    // perché vengono consultati frequentemente nella vista calendario
    const dateString = startOfDay.toISOString().split('T')[0];
    const cacheKey = `appointments:date:${barberId}:${dateString}`;
    
    return cache.getOrSet(cacheKey, async () => {
      return db.query.appointments.findMany({
        where: and(
          eq(appointments.barberId, barberId),
          between(appointments.date, startOfDay, endOfDay)
        ),
        with: {
          client: true,
          barber: true,
          service: true,
        },
        orderBy: [asc(appointments.date)],
      });
    }, 5 * 60 * 1000); // 5 minuti
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [createdAppointment] = await db.insert(appointments).values(appointment).returning();
    
    // Invalidiamo la cache degli appuntamenti giornalieri
    const date = new Date(appointment.date);
    const dateString = date.toISOString().split('T')[0];
    cache.delete(`appointments:date:${appointment.barberId}:${dateString}`);
    
    return createdAppointment;
  }

  async updateAppointment(id: number, appointmentUpdate: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    // Prima otteniamo l'appuntamento corrente per conoscere la data e il barbiere da invalidare
    const [existingAppointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    
    const [appointment] = await db
      .update(appointments)
      .set(appointmentUpdate)
      .where(eq(appointments.id, id))
      .returning();
    
    if (appointment) {
      // Invalidiamo la cache dell'appuntamento precedente
      if (existingAppointment) {
        const oldDate = new Date(existingAppointment.date);
        const oldDateString = oldDate.toISOString().split('T')[0];
        cache.delete(`appointments:date:${existingAppointment.barberId}:${oldDateString}`);
      }
      
      // Invalidiamo la cache della nuova data se è cambiata
      if (appointmentUpdate.date || appointmentUpdate.barberId) {
        const newDate = appointmentUpdate.date ? new Date(appointmentUpdate.date) : new Date(existingAppointment.date);
        const newDateString = newDate.toISOString().split('T')[0];
        const barberId = appointmentUpdate.barberId || existingAppointment.barberId;
        cache.delete(`appointments:date:${barberId}:${newDateString}`);
      }
    }
    
    return appointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    // Prima otteniamo l'appuntamento per conoscere la data e il barbiere da invalidare
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    
    if (result.count > 0 && appointment) {
      // Invalidiamo la cache degli appuntamenti giornalieri
      const date = new Date(appointment.date);
      const dateString = date.toISOString().split('T')[0];
      cache.delete(`appointments:date:${appointment.barberId}:${dateString}`);
    }
    
    return result.count > 0;
  }

  // Message related methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }
  
  async getAllMessages(): Promise<Message[]> {
    return db.select().from(messages);
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<MessageWithSender[]> {
    const results = await db.query.messages.findMany({
      where: or(
        and(
          eq(messages.senderId, user1Id),
          eq(messages.receiverId, user2Id)
        ),
        and(
          eq(messages.senderId, user2Id),
          eq(messages.receiverId, user1Id)
        )
      ),
      with: {
        sender: true,
      },
      orderBy: [asc(messages.timestamp)],
    });
    
    return results;
  }

  async getUnreadMessageCount(userId: number): Promise<Record<number, number>> {
    const unreadMessages = await db.select({
      senderId: messages.senderId,
      count: sql`COUNT(*)::int`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, userId),
        eq(messages.isRead, false)
      )
    )
    .groupBy(messages.senderId);
    
    const counts: Record<number, number> = {};
    
    for (const { senderId, count } of unreadMessages) {
      counts[senderId] = count;
    }
    
    return counts;
  }

  async getRecentChats(userId: number): Promise<{userId: number, user: User, lastMessage: Message, unreadCount: number}[]> {
    // Approccio aggiornato: prima raggruppiamo per ogni partner, poi otteniamo i dettagli separatamente
    // Otteniamo solo gli ID unici dei partner di chat
    const partnerIds = await db.select({
      partnerId: sql<number>`DISTINCT 
        CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} 
             ELSE ${messages.senderId} 
        END`,
    })
    .from(messages)
    .where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    );
    
    const result = [];
    const unreadCounts = await this.getUnreadMessageCount(userId);
    
    // Per ogni partner, otteniamo il loro profilo e l'ultimo messaggio
    for (const { partnerId } of partnerIds) {
      // Utilizziamo la cache per l'utente
      const user = await this.getUser(partnerId);
      if (!user) continue;
      
      // Otteniamo l'ultimo messaggio scambiato
      const [lastMessage] = await db.select()
        .from(messages)
        .where(
          or(
            and(
              eq(messages.senderId, userId),
              eq(messages.receiverId, partnerId)
            ),
            and(
              eq(messages.senderId, partnerId),
              eq(messages.receiverId, userId)
            )
          )
        )
        .orderBy(desc(messages.timestamp))
        .limit(1);
      
      if (!lastMessage) continue;
      
      // Aggiungiamo alla lista dei risultati
      result.push({
        userId: partnerId,
        user,
        lastMessage,
        unreadCount: unreadCounts[partnerId] || 0,
      });
    }
    
    // Ordiniamo per timestamp del messaggio più recente
    result.sort((a, b) => 
      new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );
    
    return result;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      timestamp: new Date(),
      isRead: false,
    }).returning();
    
    return message;
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<boolean> {
    const result = await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.isRead, false)
        )
      );
    
    return result.count > 0;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Utilizziamo una transazione per assicurarci che tutte le operazioni di eliminazione abbiano successo o falliscano insieme
    return db.transaction(async (tx) => {
      // 1. Eliminiamo tutti gli appuntamenti del cliente o del barbiere
      await tx.delete(appointments).where(
        or(
          eq(appointments.clientId, id),
          eq(appointments.barberId, id)
        )
      );
      
      // 2. Eliminiamo tutti i messaggi inviati o ricevuti dall'utente
      await tx.delete(messages).where(
        or(
          eq(messages.senderId, id),
          eq(messages.receiverId, id)
        )
      );
      
      // 3. Eliminiamo le statistiche associate (solo per i barbieri)
      await tx.delete(statistics).where(eq(statistics.barberId, id));
      
      // 4. Eliminiamo le recensioni associate (per barbieri o clienti)
      await tx.delete(reviews).where(
        or(
          eq(reviews.clientId, id),
          eq(reviews.barberId, id)
        )
      );
      
      // 5. Recuperiamo l'utente per poter invalidare la cache in seguito
      const [user] = await tx.select().from(users).where(eq(users.id, id));
      
      // 6. Infine eliminiamo l'utente
      const result = await tx.delete(users).where(eq(users.id, id));
      
      // 7. Invalidiamo tutte le cache relative all'utente
      if (user) {
        cache.delete(`user:${id}`);
        cache.delete(`user:username:${user.username}`);
        cache.delete('users:barbers');
        cache.delete('users:clients');
        cache.delete(`users:role:${user.role}`);
        
        // Invalidate appointment caches if user is barber
        if (user.isBarber || user.role === UserRole.BARBER) {
          // Clear all date-specific appointment caches for this barber
          // Non possiamo sapere tutte le date, ma invalidiamo la cache completa
          cache.invalidateByTag('appointments');
          
          // Se il barbiere ha un barberCode, invalidiamo anche la cache relativa
          if (user.barberCode) {
            cache.delete(`users:clients:barberCode:${user.barberCode}`);
          }
        }
        
        // Se è un cliente con barberCode, invalidiamo la cache relativa
        if ((!user.isBarber || user.role === UserRole.CLIENT) && user.barberCode) {
          cache.delete(`users:clients:barberCode:${user.barberCode}`);
        }
      }
      
      return result.count > 0;
    });
  }
  
  // Statistics related operations
  async getBarberStatistics(barberId: number, period?: { start: Date, end: Date }): Promise<Statistics[]> {
    let query = db.select().from(statistics).where(eq(statistics.barberId, barberId));
    
    if (period) {
      query = query.where(between(statistics.date, period.start, period.end));
    }
    
    return query.orderBy(asc(statistics.date));
  }
  
  async createOrUpdateDailyStatistics(barberId: number, date: Date, data: Partial<InsertStatistics>): Promise<Statistics> {
    // Verifica se esiste già una statistica per questo giorno
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [existingStat] = await db.select().from(statistics).where(
      and(
        eq(statistics.barberId, barberId),
        between(statistics.date, startOfDay, endOfDay)
      )
    );
    
    if (existingStat) {
      // Aggiorna la statistica esistente
      const [updatedStat] = await db.update(statistics)
        .set(data)
        .where(eq(statistics.id, existingStat.id))
        .returning();
      return updatedStat;
    } else {
      // Crea una nuova statistica
      const [newStat] = await db.insert(statistics)
        .values({
          ...data,
          barberId,
          date: startOfDay,
        })
        .returning();
      return newStat;
    }
  }
  
  // Review related operations
  async createReview(review: InsertReview): Promise<Review> {
    const [createdReview] = await db.insert(reviews).values(review).returning();
    return createdReview;
  }
  
  async getReviewsByBarber(barberId: number): Promise<ReviewWithDetails[]> {
    return db.query.reviews.findMany({
      where: eq(reviews.barberId, barberId),
      with: {
        client: true,
        barber: true,
        appointment: true,
      },
      orderBy: [desc(reviews.createdAt)],
    });
  }
  
  async getReviewsByClient(clientId: number): Promise<ReviewWithDetails[]> {
    return db.query.reviews.findMany({
      where: eq(reviews.clientId, clientId),
      with: {
        client: true,
        barber: true,
        appointment: true,
      },
      orderBy: [desc(reviews.createdAt)],
    });
  }
  
  // Notification related operations
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }
  
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }
  
  async getAllNotifications(): Promise<Notification[]> {
    return db.select().from(notifications)
      .orderBy(desc(notifications.createdAt));
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return result[0]?.count || 0;
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [createdNotification] = await db.insert(notifications)
      .values(notification)
      .returning();
    
    return createdNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return result.length > 0;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .returning();
    
    return result.length > 0;
  }
}

// Esportiamo un'istanza della classe DatabaseStorage
export const storage = new DatabaseStorage();
