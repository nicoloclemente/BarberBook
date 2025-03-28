import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  isBarber: boolean("is_barber").default(false).notNull(),
  imageUrl: text("image_url"),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    name: true,
    phone: true,
    isBarber: true,
    imageUrl: true,
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

// Extended types with joined data for frontend use
export type AppointmentWithDetails = Appointment & {
  client: User;
  service: Service;
};

export type MessageWithSender = Message & {
  sender: User;
};
