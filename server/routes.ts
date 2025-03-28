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
  insertStatisticsSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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

    const appointments = await storage.getAppointmentsByDate(user.id, date);
    res.json(appointments);
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
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

  return httpServer;
}
