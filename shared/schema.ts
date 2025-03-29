import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enum per i tipi di utenti
export const UserRole = {
  ADMIN: 'admin',
  BARBER: 'barber',
  CLIENT: 'client',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default(UserRole.CLIENT),
  isBarber: boolean("is_barber").default(false).notNull(), // manteniamo per retrocompatibilità
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  isApproved: boolean("is_approved").default(false), // Solo per i barbieri, approvati dall'admin
  preferredBarberId: integer("preferred_barber_id"), // Barbiere preferito per i clienti (deprecato)
  barberCode: text("barber_code"), // Codice univoco del barbiere che il cliente può utilizzare
  workingHours: jsonb("working_hours").$type<{
    monday: { start: string; end: string; enabled: boolean }[];
    tuesday: { start: string; end: string; enabled: boolean }[];
    wednesday: { start: string; end: string; enabled: boolean }[];
    thursday: { start: string; end: string; enabled: boolean }[];
    friday: { start: string; end: string; enabled: boolean }[];
    saturday: { start: string; end: string; enabled: boolean }[];
    sunday: { start: string; end: string; enabled: boolean }[];
  }>(),
  breaks: jsonb("breaks").$type<{ 
    date: string; 
    slots: { start: string; end: string }[] 
  }[]>(),
  closedDays: jsonb("closed_days").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many, one }) => ({
  appointments: many(appointments),
  appointmentsAsBarber: many(appointments, { relationName: "barber" }),
  appointmentsAsClient: many(appointments, { relationName: "client" }),
  messagesSent: many(messages, { relationName: "sender" }),
  messagesReceived: many(messages, { relationName: "receiver" }),
  preferredBarber: one(users, {
    fields: [users.preferredBarberId],
    references: [users.id],
  })
}));

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    name: true,
    phone: true,
    role: true,
    isBarber: true,
    imageUrl: true,
    isActive: true,
    isApproved: true,
    preferredBarberId: true,
    barberCode: true,
    workingHours: true,
    breaks: true,
    closedDays: true,
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // stored in cents
  duration: integer("duration").notNull(), // stored in minutes
  imageUrl: text("image_url"),
});

export const insertServiceSchema = createInsertSchema(services)
  .pick({
    name: true,
    description: true,
    price: true,
    duration: true,
    imageUrl: true,
  });

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  clientId: integer("client_id").notNull(),
  barberId: integer("barber_id").notNull(),
  serviceId: integer("service_id").notNull(),
  status: text("status").notNull(), // "pending", "confirmed", "cancelled", "completed"
  notes: text("notes"),
  walkIn: boolean("walk_in").default(false).notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointments)
  .pick({
    date: true,
    clientId: true,
    barberId: true,
    serviceId: true,
    status: true,
    notes: true,
    walkIn: true,
  });

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const insertMessageSchema = createInsertSchema(messages)
  .pick({
    senderId: true,
    receiverId: true,
    content: true,
  });

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const appointmentRelations = relations(appointments, ({ one }) => ({
  client: one(users, {
    fields: [appointments.clientId],
    references: [users.id],
    relationName: "client"
  }),
  barber: one(users, {
    fields: [appointments.barberId],
    references: [users.id],
    relationName: "barber"
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id]
  })
}));

export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver"
  })
}));

// Statistiche
export const statistics = pgTable("statistics", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id").notNull(),
  date: timestamp("date").notNull(),
  totalAppointments: integer("total_appointments").notNull().default(0),
  completedAppointments: integer("completed_appointments").notNull().default(0),
  totalRevenue: integer("total_revenue").notNull().default(0), // in cents
  newClients: integer("new_clients").notNull().default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 1 }).default('0'),
});

export const statisticsRelations = relations(statistics, ({ one }) => ({
  barber: one(users, {
    fields: [statistics.barberId],
    references: [users.id]
  })
}));

export const insertStatisticsSchema = createInsertSchema(statistics)
  .pick({
    barberId: true,
    date: true,
    totalAppointments: true,
    completedAppointments: true,
    totalRevenue: true,
    newClients: true,
    averageRating: true,
  });

export type InsertStatistics = z.infer<typeof insertStatisticsSchema>;
export type Statistics = typeof statistics.$inferSelect;

// Recensioni
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().unique(),
  clientId: integer("client_id").notNull(),
  barberId: integer("barber_id").notNull(),
  rating: integer("rating").notNull(), // da 1 a 5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviewRelations = relations(reviews, ({ one }) => ({
  appointment: one(appointments, {
    fields: [reviews.appointmentId],
    references: [appointments.id]
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id]
  }),
  barber: one(users, {
    fields: [reviews.barberId],
    references: [users.id]
  })
}));

export const insertReviewSchema = createInsertSchema(reviews)
  .pick({
    appointmentId: true,
    clientId: true,
    barberId: true,
    rating: true,
    comment: true,
  });

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Extended types with joined data for frontend use
export type AppointmentWithDetails = Appointment & {
  client: User;
  barber: User;
  service: Service;
};

export type MessageWithSender = Message & {
  sender: User;
};

export type StatisticsWithBarber = Statistics & {
  barber: User;
};

export type ReviewWithDetails = Review & {
  client: User;
  barber: User;
  appointment: Appointment;
};

// Tipo di notifica
export const NotificationType = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_REMINDER_SAME_DAY: 'appointment_reminder_same_day',
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_MODIFIED: 'appointment_modified',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  APPOINTMENT_REQUEST: 'appointment_request',
  NEW_MESSAGE: 'new_message',
  SYSTEM: 'system',
} as const;

export type NotificationTypeType = typeof NotificationType[keyof typeof NotificationType];

// Notifiche
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Utente destinatario
  type: text("type").notNull(), // Tipo di notifica
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: integer("related_id"), // ID correlato (es. appointmentId, messageId)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const insertNotificationSchema = createInsertSchema(notifications)
  .pick({
    userId: true,
    type: true,
    title: true,
    message: true,
    isRead: true,
    relatedId: true,
  });

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type NotificationWithUser = Notification & {
  user: User;
};

// Tabella delle sessioni (per connect-pg-simple)
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey().notNull(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
