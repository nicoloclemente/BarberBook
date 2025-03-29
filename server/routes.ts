import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { WebSocketServer, WebSocket } from "ws";
import { 
  insertServiceSchema, 
  insertAppointmentSchema, 
  insertMessageSchema, 
  insertReviewSchema, 
  insertStatisticsSchema,
  insertUserSchema,
  insertNotificationSchema,
  UserRole
} from "@shared/schema";
import { notificationService } from "./notification-service";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { cache } from "./cache";

// Map to store active client connections
const clients = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Services Routes
  app.get("/api/services", async (req, res) => {
    const services = await storage.getAllServices();
    res.json(services);
  });

  app.post("/api/services", async (req, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create service" });
      }
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    const service = await storage.getService(id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json(service);
  });

  app.put("/api/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    try {
      const serviceData = insertServiceSchema.partial().parse(req.body);
      const updatedService = await storage.updateService(id, serviceData);
      
      if (!updatedService) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to update service" });
      }
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    const deleted = await storage.deleteService(id);
    if (!deleted) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.status(204).end();
  });

  // Appointments Routes
  
  // Get available time slots
  app.get("/api/availability/:barberId/:date", async (req, res) => {
    const barberId = parseInt(req.params.barberId);
    if (isNaN(barberId)) {
      return res.status(400).json({ error: "Invalid barber ID" });
    }

    const dateStr = req.params.date;
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Genera chiave univoca per la cache
    const cacheKey = `availability:${barberId}:${dateStr}`;

    try {
      // Utilizza la cache quando possibile
      const availabilityData = await cache.getOrSet(
        cacheKey,
        async () => {
          // Get the barber
          const barber = await storage.getUser(barberId);
          if (!barber || !barber.isBarber) {
            throw new Error("Barber not found");
          }
          
          // Get existing appointments for the day
          const appointments = await storage.getAppointmentsByDate(barberId, date);
          
          // Get the working hours for the day of the week
          const dayOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
          const workingHours = barber.workingHours ? barber.workingHours[dayOfWeek] : null;
          
          // Check if the barber has any breaks for this date
          const dateFormatted = date.toISOString().split('T')[0];
          const breaks = barber.breaks ? barber.breaks.filter(b => b.date === dateFormatted) : [];
          
          // Generate available time slots
          const availableSlots = [];
          
          if (workingHours && workingHours.length > 0) {
            // For each working hour block
            for (const block of workingHours) {
              if (!block.enabled) continue;
              
              const startTime = block.start.split(':').map(Number);
              const endTime = block.end.split(':').map(Number);
              
              // Generate slots at 30-minute intervals
              let current = new Date(date);
              current.setHours(startTime[0], startTime[1], 0, 0);
              
              const end = new Date(date);
              end.setHours(endTime[0], endTime[1], 0, 0);
              
              while (current < end) {
                const slotEnd = new Date(current);
                slotEnd.setMinutes(slotEnd.getMinutes() + 30);
                
                // Skip if this slot overlaps with a break
                let isBreak = false;
                for (const breakItem of breaks) {
                  for (const slot of breakItem.slots) {
                    const breakStart = slot.start.split(':').map(Number);
                    const breakEnd = slot.end.split(':').map(Number);
                    
                    const breakStartDate = new Date(date);
                    breakStartDate.setHours(breakStart[0], breakStart[1], 0, 0);
                    
                    const breakEndDate = new Date(date);
                    breakEndDate.setHours(breakEnd[0], breakEnd[1], 0, 0);
                    
                    if (
                      (current >= breakStartDate && current < breakEndDate) || 
                      (slotEnd > breakStartDate && slotEnd <= breakEndDate) ||
                      (current <= breakStartDate && slotEnd >= breakEndDate)
                    ) {
                      isBreak = true;
                      break;
                    }
                  }
                  if (isBreak) break;
                }
                
                if (!isBreak) {
                  // Check if the slot is already booked
                  let isBooked = false;
                  for (const appt of appointments) {
                    const apptDate = new Date(appt.date);
                    const apptEndTime = new Date(apptDate);
                    // Use the service duration if available, or default to 30 minutes
                    const duration = appt.service?.duration || 30;
                    apptEndTime.setMinutes(apptEndTime.getMinutes() + duration);
                    
                    if (
                      (current >= apptDate && current < apptEndTime) ||
                      (slotEnd > apptDate && slotEnd <= apptEndTime) ||
                      (current <= apptDate && slotEnd >= apptEndTime)
                    ) {
                      isBooked = true;
                      break;
                    }
                  }
                  
                  if (!isBooked) {
                    availableSlots.push({
                      start: current.toISOString(),
                      end: slotEnd.toISOString()
                    });
                  }
                }
                
                // Move to the next slot
                current.setMinutes(current.getMinutes() + 30);
              }
            }
          }
          
          return {
            barberId,
            date: date.toISOString(),
            availableSlots
          };
        },
        {
          // Utilizza un TTL più lungo per gli orari di disponibilità futura
          keyType: 'working-hours',
          // Taglia l'invalidazione per barber ID e data
          tags: [`barber:${barberId}`, `date:${dateStr.substring(0, 10)}`]
        }
      );
      
      res.json(availabilityData);
    } catch (error) {
      if (error.message === "Barber not found") {
        return res.status(404).json({ error: "Barber not found" });
      }
      
      console.error("Error calculating availability:", error);
      res.status(500).json({ error: "Failed to calculate availability" });
    }
  });
  
  app.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user!;
    let appointments;

    if (user.isBarber) {
      appointments = await storage.getAppointmentsByBarber(user.id);
    } else {
      appointments = await storage.getAppointmentsByClient(user.id);
    }

    res.json(appointments);
  });

  app.get("/api/appointments/date/:date", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isBarber) {
      return res.status(403).json({ error: "Only barbers can access this endpoint" });
    }

    const dateStr = req.params.date;
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Utilizziamo la cache per gli appuntamenti giornalieri per migliorare le prestazioni
    const cacheKey = `appointments:barber:${user.id}:date:${dateStr}`;
    
    const appointments = await cache.getOrSet(
      cacheKey,
      () => storage.getAppointmentsByDate(user.id, date),
      { 
        ttlMs: 2 * 60 * 1000,  // 2 minuti di cache per gli appuntamenti
        keyType: 'appointment',
        tags: [`barber:${user.id}`, `date:${dateStr}`]
      }
    );
    
    res.json(appointments);
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      
      // Invalida la cache per gli appuntamenti di questo barbiere e per questa data
      const dateStr = new Date(appointmentData.date).toISOString().split('T')[0];
      cache.invalidateByTag(`barber:${appointmentData.barberId}`);
      cache.invalidateByTag(`date:${dateStr}`);
      
      console.log(`Invalidated cache for barber ${appointmentData.barberId} and date ${dateStr} after creating appointment`);
      
      // Se lo stato è "pending", notifica il barbiere della nuova richiesta
      if (appointment.status === 'pending') {
        // Ottieni i dati del cliente per il messaggio di notifica
        const client = await storage.getUser(appointmentData.clientId);
        if (client) {
          // Crea una notifica per il barbiere
          await notificationService.createAppointmentRequestNotification(
            appointmentData.barberId,
            appointment,
            client.name
          );
        }
      }
      
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create appointment" });
      }
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }

    const appointment = await storage.getAppointmentWithDetails(id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const user = req.user!;
    // Check if the user has access to this appointment
    if (user.isBarber && appointment.barberId !== user.id) {
      return res.status(403).json({ error: "Not authorized to access this appointment" });
    } else if (!user.isBarber && appointment.clientId !== user.id) {
      return res.status(403).json({ error: "Not authorized to access this appointment" });
    }

    res.json(appointment);
  });

  app.put("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }

    const appointment = await storage.getAppointment(id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const user = req.user!;
    // Check if the user has access to update this appointment
    if (user.isBarber && appointment.barberId !== user.id) {
      return res.status(403).json({ error: "Not authorized to update this appointment" });
    } else if (!user.isBarber && appointment.clientId !== user.id) {
      return res.status(403).json({ error: "Not authorized to update this appointment" });
    }

    try {
      const appointmentData = insertAppointmentSchema.partial().parse(req.body);
      const updatedAppointment = await storage.updateAppointment(id, appointmentData);
      
      if (!updatedAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Invalida la cache per gli appuntamenti di questo barbiere e per questa data
      const dateStr = new Date(updatedAppointment.date).toISOString().split('T')[0];
      cache.invalidateByTag(`barber:${updatedAppointment.barberId}`);
      cache.invalidateByTag(`date:${dateStr}`);
      
      console.log(`Invalidated cache for barber ${updatedAppointment.barberId} and date ${dateStr} after updating appointment ${id}`);
      
      // Se lo stato è stato aggiornato, invia notifiche appropriate
      if (appointmentData.status && appointment.status !== appointmentData.status) {
        // Invia notifica al cliente basata sul nuovo stato
        if (appointmentData.status === 'confirmed') {
          await notificationService.createAppointmentConfirmation(
            updatedAppointment.clientId,
            updatedAppointment
          );
        } else if (appointmentData.status === 'cancelled') {
          await notificationService.createAppointmentCancellation(
            updatedAppointment.clientId, 
            updatedAppointment
          );
        } else if (appointmentData.status === 'completed') {
          // Si potrebbe inviare un'altra notifica per appuntamento completato
          // e magari chiedere una recensione
        }
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to update appointment" });
      }
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }

    const appointment = await storage.getAppointment(id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const user = req.user!;
    // Check if the user has access to delete this appointment
    if (user.isBarber && appointment.barberId !== user.id) {
      return res.status(403).json({ error: "Not authorized to delete this appointment" });
    } else if (!user.isBarber && appointment.clientId !== user.id) {
      return res.status(403).json({ error: "Not authorized to delete this appointment" });
    }

    const deleted = await storage.deleteAppointment(id);
    if (!deleted) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Invalida la cache per gli appuntamenti di questo barbiere e per questa data
    const dateStr = new Date(appointment.date).toISOString().split('T')[0];
    cache.invalidateByTag(`barber:${appointment.barberId}`);
    cache.invalidateByTag(`date:${dateStr}`);
    
    console.log(`Invalidated cache for barber ${appointment.barberId} and date ${dateStr} after deleting appointment ${id}`);

    res.status(204).end();
  });

  // Messages Routes
  app.get("/api/messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const currentUserId = req.user!.id;
    const messages = await storage.getMessagesBetweenUsers(currentUserId, userId);
    
    // Mark messages as read
    await storage.markMessagesAsRead(userId, currentUserId);
    
    res.json(messages);
  });

  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const currentUserId = req.user!.id;
    const chats = await storage.getRecentChats(currentUserId);
    res.json(chats);
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.id
      });
      
      const message = await storage.createMessage(messageData);
      
      // Notify the recipient if they're connected
      const recipientSocket = clients.get(messageData.receiverId);
      if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
        recipientSocket.send(JSON.stringify({
          type: 'message',
          data: message
        }));
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // Get all barbers
  app.get("/api/barbers", async (req, res) => {
    const barbers = await storage.getAllBarbers();
    res.json(barbers);
  });

  // Get all clients
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isBarber) {
      return res.status(403).json({ error: "Only barbers can access this endpoint" });
    }

    const clients = await storage.getAllClients();
    res.json(clients);
  });
  
  // Get clients by barber code
  app.get("/api/clients/barber-code/:barberCode", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isBarber && user.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Only barbers can access this endpoint" });
    }
    
    const { barberCode } = req.params;
    
    // Verifichiamo che il barberCode appartenga all'utente corrente (se non è admin)
    if (user.role !== UserRole.ADMIN && user.barberCode !== barberCode) {
      return res.status(403).json({ error: "You can only access clients associated with your barber code" });
    }

    const clients = await storage.getClientsByBarberCode(barberCode);
    res.json(clients);
  });
  
  // Statistics Routes
  app.get("/api/statistics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isBarber) {
      return res.status(403).json({ error: "Only barbers can access this endpoint" });
    }
    
    let startDate, endDate;
    
    if (req.query.start && req.query.end) {
      startDate = new Date(req.query.start as string);
      endDate = new Date(req.query.end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
    }
    
    const period = startDate && endDate ? { start: startDate, end: endDate } : undefined;
    const statistics = await storage.getBarberStatistics(user.id, period);
    res.json(statistics);
  });
  
  app.post("/api/statistics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user!;
    if (!user.isBarber) {
      return res.status(403).json({ error: "Only barbers can access this endpoint" });
    }
    
    try {
      const statsData = insertStatisticsSchema.partial().parse({
        ...req.body,
        barberId: user.id
      });
      
      // Estrai la data dal body o usa la data corrente
      const date = req.body.date ? new Date(req.body.date) : new Date();
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      const statistics = await storage.createOrUpdateDailyStatistics(user.id, date, statsData);
      res.status(201).json(statistics);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create/update statistics" });
      }
    }
  });
  
  // Reviews Routes
  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        clientId: req.user!.id,
        createdAt: new Date()
      });
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create review" });
      }
    }
  });
  
  app.get("/api/reviews/barber/:barberId", async (req, res) => {
    const barberId = parseInt(req.params.barberId);
    if (isNaN(barberId)) {
      return res.status(400).json({ error: "Invalid barber ID" });
    }
    
    const reviews = await storage.getReviewsByBarber(barberId);
    res.json(reviews);
  });
  
  app.get("/api/reviews/client", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const reviews = await storage.getReviewsByClient(req.user!.id);
    res.json(reviews);
  });
  
  // User Routes
  app.get("/api/user/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Solo l'utente stesso o un barbiere/admin può vedere le informazioni di un utente specifico
    const currentUser = req.user!;
    if (currentUser.id !== id && !currentUser.isBarber && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Not authorized to access this user" });
    }

    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  });

  // Endpoint specifico per gli orari di lavoro
  app.post("/api/users/:id/working-hours", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    // Solo l'utente stesso o un admin può modificare gli orari di lavoro
    const currentUser = req.user!;
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Not authorized to update working hours for this user" });
    }
    
    try {
      const userData = {
        workingHours: req.body.workingHours
      };
      
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Invalida tutte le cache relative agli orari di lavoro di questo barbiere
      const invalidatedCount = cache.invalidateByTag(`barber:${id}`);
      console.log(`Invalidated ${invalidatedCount} cached availability entries for barber ${id}`);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating working hours:", error);
      res.status(500).json({ error: "Failed to update working hours" });
    }
  });
  
  // Endpoint specifico per pause e ferie
  app.post("/api/users/:id/breaks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    // Solo l'utente stesso o un admin può modificare le pause
    const currentUser = req.user!;
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Not authorized to update breaks for this user" });
    }
    
    try {
      const userData = {
        breaks: req.body.breaks
      };
      
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Invalida le cache anche quando vengono aggiornate le pause
      // Estrai le date dalle pause per invalidare solo quelle giornate specifiche
      if (req.body.breaks && Array.isArray(req.body.breaks)) {
        const dates = req.body.breaks.map(b => b.date);
        const uniqueDates = [...new Set(dates)];
        
        // Invalida per barbiere
        cache.invalidateByTag(`barber:${id}`);
        
        // Invalida anche per date specifiche
        for (const dateStr of uniqueDates) {
          cache.invalidateByTag(`date:${dateStr}`);
        }
        
        console.log(`Invalidated cache for barber ${id} and dates: ${uniqueDates.join(', ')}`);
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating breaks:", error);
      res.status(500).json({ error: "Failed to update breaks" });
    }
  });
  
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Solo l'utente stesso o un admin può modificare le informazioni di un utente
    const currentUser = req.user!;
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Not authorized to update this user" });
    }

    try {
      // Utilizziamo uno schema parziale per consentire aggiornamenti selettivi
      const userData = insertUserSchema.partial().parse(req.body);
      
      // Impediamo la modifica di campi sensibili se non sei un admin
      if (currentUser.role !== UserRole.ADMIN) {
        delete userData.role;
        delete userData.isApproved;
        delete userData.isActive;
      }
      
      // Non consentire di cambiare username o password tramite questa rotta
      delete userData.username;
      delete userData.password;
      
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to update user" });
      }
    }
  });
  
  // Endpoint per eliminare l'account utente
  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Verifica che l'utente stia eliminando il proprio account o che sia un admin
    const currentUser = req.user!;
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Not authorized to delete this user" });
    }

    try {
      // Controlla se un barbiere sta cercando di eliminare il proprio account
      if (currentUser.id === id && currentUser.isBarber) {
        // Conta gli appuntamenti futuri per verificare che non ci siano clienti in attesa
        const today = new Date();
        const appointments = await storage.getAppointmentsByBarber(id);
        const futureAppointments = appointments.filter(appt => new Date(appt.date) > today);
        
        if (futureAppointments.length > 0) {
          return res.status(409).json({ 
            error: "Non puoi eliminare il tuo account perché hai appuntamenti futuri con clienti. Cancella o completa tutti gli appuntamenti prima di eliminare l'account.",
            appointmentsCount: futureAppointments.length 
          });
        }
      }
      
      // Procedi con l'eliminazione
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Se l'utente sta eliminando il proprio account, effettua il logout
      if (currentUser.id === id) {
        req.logout((err) => {
          if (err) {
            console.error("Error during logout after account deletion:", err);
          }
          res.status(204).end();
        });
      } else {
        res.status(204).end();
      }
    } catch (error) {
      console.error("Error during user deletion:", error);
      res.status(500).json({ error: "Failed to delete user account" });
    }
  });

  // Admin Routes
  app.get("/api/admin/barbers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can access this endpoint" });
    }
    
    const barbers = await storage.getUsersByRole('barber');
    res.json(barbers);
  });
  
  app.get("/api/admin/clients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can access this endpoint" });
    }
    
    const clients = await storage.getUsersByRole('client');
    res.json(clients);
  });
  
  app.put("/api/admin/approve-barber/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can access this endpoint" });
    }
    
    const barberId = parseInt(req.params.id);
    if (isNaN(barberId)) {
      return res.status(400).json({ error: "Invalid barber ID" });
    }
    
    const barber = await storage.approveBarber(barberId);
    if (!barber) {
      return res.status(404).json({ error: "Barber not found" });
    }
    
    res.json(barber);
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, request) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate') {
          // Store the user's connection
          const userId = data.userId;
          clients.set(userId, ws);
          
          console.log(`User ${userId} authenticated on WebSocket`);
          
          // Send a confirmation
          ws.send(JSON.stringify({
            type: 'authenticated',
            success: true
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove the connection from the clients map
      for (const [userId, socket] of clients.entries()) {
        if (socket === ws) {
          clients.delete(userId);
          console.log(`User ${userId} disconnected from WebSocket`);
          break;
        }
      }
    });
  });

  // Notifications Routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.user!.id;
    const notifications = await storage.getNotificationsByUser(userId);
    res.json(notifications);
  });
  
  app.get("/api/notifications/unread/count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.user!.id;
    const count = await storage.getUnreadNotificationCount(userId);
    res.json({ count });
  });
  
  app.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      
      // Solo amministratori o l'utente stesso possono creare notifiche per un utente
      const currentUser = req.user!;
      if (notificationData.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to create notifications for other users" });
      }
      
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create notification" });
      }
    }
  });
  
  app.put("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }
    
    const notification = await storage.getNotification(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    // Solo l'utente destinatario può segnare come letta la notifica
    if (notification.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to mark this notification as read" });
    }
    
    const success = await storage.markNotificationAsRead(id);
    if (!success) {
      return res.status(500).json({ error: "Failed to mark notification as read" });
    }
    
    res.status(204).end();
  });
  
  app.put("/api/notifications/all/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.user!.id;
    const success = await storage.markAllNotificationsAsRead(userId);
    
    if (!success) {
      return res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
    
    res.status(204).end();
  });

  return httpServer;
}
